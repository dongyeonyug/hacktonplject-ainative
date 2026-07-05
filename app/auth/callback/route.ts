import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";

/**
 * Handles both the OAuth PKCE flow (`code`) and the email-link confirmation
 * flow (`token_hash` + `type`) so a single route works for social sign-in and
 * email sign-up confirmation. On success, ensures a pseudonymous `profiles`
 * row exists (AC-1) before sending the user into onboarding.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await ensureProfile();
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      await ensureProfile();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent("인증 링크가 유효하지 않거나 만료되었습니다.")}`,
  );
}
