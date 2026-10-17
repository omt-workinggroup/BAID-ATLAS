// Supabase Auth "Send SMS" hook: delivers sign-in codes through SasuSync (https://sms.sasusync.com).
//
// Supabase calls this function with a signed payload whenever someone asks for a code. We verify the
// signature, then send the code with SasuSync's send API. Secrets (Supabase -> Edge Functions -> Secrets):
//   SASUSYNC_API_KEY      your SasuSync API key (never commit it or paste it anywhere else)
//   SASUSYNC_SENDER       your approved sender ID, e.g. "BAIDAtlas"
//   SEND_SMS_HOOK_SECRET  the secret Supabase shows when you enable the Send SMS hook ("v1,whsec_...")
//   SASUSYNC_BASE_URL     optional, defaults to https://sms.sasusync.com
//   SITE_DOMAIN           optional, defaults to baid-atlas.vercel.app (used for code auto-fill)
// The code and the API key are never logged.
import { Webhook } from "npm:standardwebhooks@1.0.0";

type HookPayload = { user: { phone: string }; sms: { otp: string } };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Supabase hook error format: the message is shown to the app, so keep it generic.
const fail = (status: number, message: string) => json(status, { error: { http_code: status, message } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail(405, "Method not allowed");

  const apiKey = Deno.env.get("SASUSYNC_API_KEY");
  const sender = Deno.env.get("SASUSYNC_SENDER");
  const hookSecret = (Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "").replace(/^v1,whsec_/, "");
  const baseUrl = (Deno.env.get("SASUSYNC_BASE_URL") ?? "https://sms.sasusync.com").replace(/\/+$/, "");
  if (!apiKey || !sender || !hookSecret) {
    console.error("send-sms: missing SASUSYNC_API_KEY, SASUSYNC_SENDER or SEND_SMS_HOOK_SECRET");
    return fail(500, "SMS sending is not configured");
  }

  const body = await req.text();
  let payload: HookPayload;
  try {
    payload = new Webhook(hookSecret).verify(body, Object.fromEntries(req.headers)) as HookPayload;
  } catch {
    return fail(401, "Invalid signature");
  }

  // Supabase sends numbers without "+" (e.g. 233241234567), the usual format for Ghanaian SMS gateways.
  const recipient = payload.user.phone.replace(/^\+/, "");
  // The last line is the standard origin-bound format ("@domain #code"): Android fills the code in
  // automatically and iOS offers it above the keyboard. Kept to one SMS part (under 160 characters).
  const otp = payload.sms.otp;
  const domain = Deno.env.get("SITE_DOMAIN") ?? "baid-atlas.vercel.app";
  const message = `Your BAID Atlas code is ${otp}. Don't share it with anyone.\n\n@${domain} #${otp}`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1/send`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender, recipients: [recipient], message }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error("send-sms: SasuSync unreachable", e instanceof Error ? e.name : "error");
    return fail(502, "Could not send the SMS");
  }

  // SasuSync replies with {"success": true, ...}; a 200 with success=false is still a failure.
  const text = await res.text();
  let ok = res.ok;
  try {
    if ((JSON.parse(text) as { success?: unknown }).success === false) ok = false;
  } catch {
    // Not JSON: rely on the status code.
  }
  if (!ok) {
    // The response explains rejections (bad key, unapproved sender, low balance); it contains no code.
    console.error("send-sms: SasuSync rejected the request", res.status, text.slice(0, 300));
    return fail(502, "Could not send the SMS");
  }
  return json(200, {});
});
