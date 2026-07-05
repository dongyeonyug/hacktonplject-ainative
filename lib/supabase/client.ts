import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key).
 * Safe to use in Client Components. All access is constrained by Row Level
 * Security — the anon key never bypasses RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
