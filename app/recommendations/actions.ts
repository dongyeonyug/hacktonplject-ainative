"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/consent";

/**
 * AC-10: logs a "saved" acceptance event for a curated institution. Mirrors
 * the append-only event-log style of app/consent/actions.ts (insert only, no
 * update/delete) — recommendation_events is a log, not a state.
 */
export async function saveRecommendationAction(formData: FormData) {
  const institutionId = String(formData.get("institution_id") ?? "");
  if (!institutionId) {
    redirect(`/recommendations?error=${encodeURIComponent("잘못된 요청입니다.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { error } = await supabase.from("recommendation_events").insert({
    user_id: user.id,
    institution_id: institutionId,
    action: "saved",
  });

  if (error) {
    redirect(`/recommendations?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/recommendations?saved=1");
}

/**
 * AC-11 / AD-4 institution-connection consent gate: grants the
 * `institution_sharing` scope so the gated "기관 연결" CTA unlocks. MVP-only:
 * this flips consent state and nothing else — it does NOT write `real_name`,
 * does NOT transfer any data to an institution, and does NOT perform an
 * actual connection. Real connection/identity-transfer is a 2차 (future) step
 * (AD-4 trigger `guard_realname` still blocks any real_name write regardless).
 */
export async function grantInstitutionSharingConsentAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  try {
    await recordConsent("institution_sharing", "grant", "recommendations_gate");
  } catch (err) {
    const message = err instanceof Error ? err.message : "동의 처리에 실패했습니다.";
    redirect(`/recommendations?error=${encodeURIComponent(message)}`);
  }

  redirect("/recommendations");
}
