"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_POLICY_VERSION } from "@/lib/consent";

/**
 * AC-15 / AD-8 age gate. Self-attestation only (documented residual risk in
 * the plan). "No" never sets age_verified — it always routes to the kind
 * block screen with crisis hotline info instead.
 */
export async function confirmAgeAction(formData: FormData) {
  const isAdult = formData.get("isAdult") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  if (!isAdult) {
    redirect("/onboarding?blocked=minor");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ age_verified: true })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/onboarding");
}

/**
 * AC-13 (critical): records BOTH the ai_processing (cross-border transfer to
 * Anthropic/US + sensitive-info processing) grant and the data_storage grant
 * shown on the same disclosure screen. Appends to the append-only ledger —
 * never updates in place (AD-3).
 */
export async function grantOnboardingConsentAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { error } = await supabase.from("consent_events").insert([
    {
      user_id: user.id,
      scope: "ai_processing" as const,
      action: "grant" as const,
      policy_version: CONSENT_POLICY_VERSION,
      source: "onboarding",
    },
    {
      user_id: user.id,
      scope: "data_storage" as const,
      action: "grant" as const,
      policy_version: CONSENT_POLICY_VERSION,
      source: "onboarding",
    },
  ]);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/onboarding");
}
