import { createClient } from "@/lib/supabase/server";

/**
 * Consent scopes/actions mirror the `consent_scope`/`consent_action` enums in
 * supabase/migrations/0001_init.sql (AD-3). Keep in sync with that migration.
 */
export const CONSENT_SCOPES = [
  "ai_processing",
  "data_storage",
  "institution_sharing",
] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const CONSENT_ACTIONS = ["grant", "revoke"] as const;
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

export interface CurrentConsentRow {
  user_id: string;
  scope: ConsentScope;
  action: ConsentAction;
  policy_version: string;
  occurred_at: string;
}

/**
 * Bump when the onboarding disclosure copy (cross-border transfer / sensitive
 * info processing notice) changes materially, so consent_events keeps an
 * auditable record of which policy text a grant applied to.
 */
export const CONSENT_POLICY_VERSION = "2026-07-04.v1";

/** Reads the derived latest-state-per-scope view for the signed-in user (RLS-scoped). */
export async function getCurrentConsents(): Promise<CurrentConsentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("current_consents").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function hasActiveConsent(scope: ConsentScope): Promise<boolean> {
  const consents = await getCurrentConsents();
  return consents.some((c) => c.scope === scope && c.action === "grant");
}

/**
 * Appends a grant/revoke row to the append-only consent_events ledger for the
 * currently signed-in user. Never updates/deletes existing rows (AD-3).
 */
export async function recordConsent(
  scope: ConsentScope,
  action: ConsentAction,
  source: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("consent_events").insert({
    user_id: user.id,
    scope,
    action,
    policy_version: CONSENT_POLICY_VERSION,
    source,
  });
  if (error) throw error;
}

/**
 * AC-13 app-layer guard: throws/returns false unless the signed-in user has an
 * active `ai_processing` grant. Intended for use by /chat route handlers or
 * server actions (T4) in addition to the middleware-level redirect gate.
 */
export async function requireAiProcessingConsent(): Promise<boolean> {
  return hasActiveConsent("ai_processing");
}
