import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  pseudonym: string | null;
  real_name: string | null;
  age_verified: boolean;
  created_at: string;
}

function fallbackPseudonym(userId: string): string {
  return `익명의취준생-${userId.slice(0, 4)}`;
}

/**
 * Ensures a `profiles` row exists for the signed-in user (AC-1: pseudonym only,
 * `real_name` always stays NULL here — it is only ever written through the
 * AD-4 guarded institution-sharing flow). Safe to call repeatedly; a no-op if
 * the profile already exists. Reads the pseudonym chosen at sign-up from
 * `user_metadata` (set in app/(auth)/actions.ts), falling back to a generated
 * one for OAuth sign-ins that skipped the pseudonym field.
 */
export async function ensureProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing;

  const pseudonym =
    (user.user_metadata?.pseudonym as string | undefined)?.trim() ||
    fallbackPseudonym(user.id);

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, pseudonym })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}
