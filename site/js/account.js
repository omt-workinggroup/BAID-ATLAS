// Accounts for agents, companies, developers and homeowners (Supabase Auth), and their applications.
// Sign-up: 1 account type, 2 account details (phone confirmed by an SMS code sent through SasuSync by the
// send-sms function), 3 role details and documents, 4 review and submit. Sign-in: phone and password.
// Documents go to the private "applications" bucket; the application row to account_applications.
// The Supabase library is only loaded on the pages that need it.
import { SUPABASE_KEY, SUPABASE_URL } from "./config.js";

export const ROLES = [
  ["agent", "Agent", "user", "You show, sell or let other people's property"],
  ["company", "Company", "building", "An agency or property firm"],
  ["developer", "Developer", "crane", "You build and sell property projects"],
  ["owner", "Homeowner", "home", "Sell or let your own home"],
];
export const roleName = (k) =>
  ROLES.find(([key]) => key === k)?.[1] ?? "Member";

// Ghana numbers: "024 123 4567", "241234567", "+233 24 123 4567" all become "+233241234567".
export function normalisePhone(input) {
  const digits = String(input ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return "+" + digits.slice(1).replace(/\D/g, "");
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("233")) return "+" + digits;
  if (digits.startsWith("0")) return "+233" + digits.slice(1);
  return "+233" + digits;
}
export const validPhone = (e164) =>
  /^\+[1-9]\d{8,14}$/.test(e164) &&
  (!e164.startsWith("+233") || e164.length === 13);
export const showPhone = (e164) =>
  e164?.startsWith("+233") && e164.length === 13
    ? `+233 ${e164.slice(4, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`
    : (e164 ?? "");

let client = null;
export async function sb() {
  if (client) return client;
  if (!window.supabase) {
    await new Promise((ok, fail) =>
      document.head.append(
        Object.assign(document.createElement("script"), {
          src: "/js/vendor/supabase.js",
          onload: ok,
          onerror: fail,
        }),
      ),
    );
  }
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

// Supabase errors in plain words. Delivery problems (gateway down, no credit) are ours, not the user's.
export function friendly(error) {
  const code = error?.code ?? "";
  const msg = String(error?.message ?? "");
  if (error?.status === 429 || /rate_limit/.test(code))
    return "Too many tries. Please wait a minute and try again.";
  if (/otp_expired|token.*(expired|invalid)/i.test(code + msg))
    return "That code is wrong or has expired. Check it, or ask for a new one.";
  if (/invalid_credentials|Invalid login/i.test(code + msg))
    return "That phone number and password don't match.";
  if (/phone_exists|already registered/i.test(code + msg))
    return "This number already has an account. Sign in instead.";
  if (/weak_password|password/i.test(code) || /Password should/i.test(msg))
    return "Choose a longer password: at least 8 characters.";
  if (
    /payload too large|exceeded the maximum|413/i.test(
      code + msg + (error?.statusCode ?? ""),
    )
  )
    return "That file is too big. Choose one under 10 MB.";
  if (/mime|invalid_mime_type/i.test(code + msg))
    return "That file type isn't accepted. Use PDF, JPG or PNG.";
  if (/email_exists|email.*(taken|registered)/i.test(code + msg))
    return "That email is already used by another account.";
  if (/user_not_found|signup.*disabled|otp_disabled/i.test(code + msg))
    return "We couldn't find an account for that number.";
  if (/sms|provider|hook/i.test(code + msg) || error?.status >= 500)
    return "We couldn't send a text message right now. Please try again in a few minutes.";
  if (error instanceof TypeError)
    return "Can't reach Propertiq right now. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

const run = async (fn) => {
  try {
    const { data, error } = await fn(await sb());
    if (error) throw error;
    return data;
  } catch (e) {
    throw Object.assign(new Error(friendly(e)), { cause: e });
  }
};

// Sign-up step 2: text a code. A new number gets a new (unfinished) account; an existing number is told to
// sign in instead. For "forgot password", existing numbers only.
export const sendCode = (phone, { forReset = false } = {}) =>
  run((c) =>
    c.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: !forReset, channel: "sms" },
    }),
  );
export const verifyCode = (phone, token) =>
  run((c) => c.auth.verifyOtp({ phone, token, type: "sms" }));
// Sign-up step 2, after the code: the password, email, name and account type, saved on the account the code
// just signed in. Without a password (editing from the review step) the password stays as it is.
export const finishAccount = ({ role, first, last, email, password }) =>
  run((c) =>
    c.auth.updateUser({
      ...(password ? { password } : {}),
      ...(email ? { email } : {}),
      data: {
        role,
        first_name: first,
        last_name: last,
        name: `${first} ${last}`.trim(),
      },
    }),
  );
export const setPassword = (password) =>
  run((c) => c.auth.updateUser({ password }));
export const signIn = (phone, password) =>
  run((c) => c.auth.signInWithPassword({ phone, password }));
export const signOut = () => run((c) => c.auth.signOut());

// The signed-in account, or null. An account that verified its phone but never finished step 4 counts as
// unfinished ({ unfinished: true }), so the sign-up page can pick up where it stopped.
export async function currentAccount() {
  try {
    const c = await sb();
    const { data } = await c.auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    const m = u.user_metadata ?? {};
    return {
      id: u.id,
      phone: u.phone ? `+${u.phone.replace(/^\+/, "")}` : null,
      email: u.email || u.new_email || null,
      emailPending: Boolean(u.new_email),
      role: m.role ?? null,
      name: m.name ?? null,
      first: m.first_name ?? null,
      last: m.last_name ?? null,
      unfinished: !m.role || !m.name,
    };
  } catch {
    return null;
  }
}

// ---- Applications (step 3 documents, step 4 submit, the status on Profile) --------------------------------
export const STATUS = {
  submitted: [
    "Submitted",
    "We've received your application. It's waiting for review.",
  ],
  under_review: [
    "Under review",
    "Our team is checking your details and documents.",
  ],
  more_info_required: [
    "More information needed",
    "We need something else from you. Check the note below.",
  ],
  approved: ["Verified", "Your account is verified. You can add properties."],
  rejected: ["Not approved", "We couldn't approve this application."],
  suspended: [
    "Suspended",
    "This account is suspended. Message us to sort it out.",
  ],
};
const ext = (file) =>
  /^[a-z0-9]{2,5}$/i.test(file.name.split(".").pop() ?? "")
    ? file.name.split(".").pop().toLowerCase()
    : "bin";
// Each file gets a new name in the user's own folder ("<user id>/<field>-<time>.<ext>"), so nothing is overwritten.
export async function uploadDoc(userId, field, file) {
  const path = `${userId}/${field}-${Date.now()}.${ext(file)}`;
  await run((c) =>
    c.storage
      .from("applications")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return path;
}
export const removeDoc = (path) =>
  run((c) => c.storage.from("applications").remove([path]));
export const submitApplication = (row) =>
  run((c) =>
    c
      .from("account_applications")
      .insert(row)
      .select("reference,status,account_type,created_at")
      .single(),
  );
// The newest application of the signed-in account, or null (none yet, or it can't be read right now).
export const latestApplication = () =>
  run((c) =>
    c
      .from("account_applications")
      .select("reference,status,account_type,created_at,reviewer_note")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ).catch(() => null);
