import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Client that acts as the signed-in admin (reads the session cookie)
export async function createClient() {
  // Supabase reads the clock, so make sure this only ever runs per request
  await connection();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead
        }
      },
    },
  });
}

// Anonymous client for the public website (only allowed to submit quotes)
export function createPublicClient() {
  return createPlainClient(url, key, { auth: { persistSession: false } });
}

export const supabaseConfigured = Boolean(url && key);
