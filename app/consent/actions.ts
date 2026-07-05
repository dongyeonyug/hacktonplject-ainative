"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CONSENT_ACTIONS,
  CONSENT_POLICY_VERSION,
  CONSENT_SCOPES,
  type ConsentAction,
  type ConsentScope,
} from "@/lib/consent";

/**
 * Consent ledger UI action: appends a grant/revoke row (AD-3 append-only
 * ledger — never updates or deletes existing rows). Used for withdrawing
 * ai_processing/data_storage and for the institution_sharing grant/revoke
 * toggle.
 */
export async function updateConsentAction(formData: FormData) {
  const scope = String(formData.get("scope") ?? "");
  const action = String(formData.get("action") ?? "");

  if (
    !CONSENT_SCOPES.includes(scope as ConsentScope) ||
    !CONSENT_ACTIONS.includes(action as ConsentAction)
  ) {
    redirect(`/consent?error=${encodeURIComponent("잘못된 요청입니다.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { error } = await supabase.from("consent_events").insert({
    user_id: user.id,
    scope: scope as ConsentScope,
    action: action as ConsentAction,
    policy_version: CONSENT_POLICY_VERSION,
    source: "consent_settings",
  });

  if (error) {
    redirect(`/consent?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/consent");
}
