"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Browser client using the signed-in user's session cookie; RLS applies to everything it does.
let client: ReturnType<typeof createBrowserClient> | undefined;
export function getBrowserClient() {
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseKey);
  return client;
}
