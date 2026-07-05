"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** AC-1: email sign-up creates a pseudonymous account — no real name is ever collected. */
export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const pseudonym = String(formData.get("pseudonym") ?? "").trim();

  if (!email || !password || !pseudonym) {
    redirect(
      `/sign-up?error=${encodeURIComponent("닉네임, 이메일, 비밀번호를 모두 입력해 주세요.")}`,
    );
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pseudonym },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    // Auto-confirmed (email confirmation disabled on the project) — session is
    // already live, so create the profile now and go straight to onboarding.
    await ensureProfile();
    redirect("/onboarding");
  }

  // Email confirmation required — profile is created in app/auth/callback
  // once the user clicks the confirmation link.
  redirect(
    `/sign-up?message=${encodeURIComponent("가입해 주셔서 감사합니다. 이메일함에서 인증 링크를 확인해 주세요.")}`,
  );
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/sign-in?error=${encodeURIComponent("이메일과 비밀번호를 입력해 주세요.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  await ensureProfile();
  redirect("/onboarding");
}

/** Optional social login (AC-1 "email + optional social"). */
export async function signInWithOAuthAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "google") as "google";
  const origin = await getOrigin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/sign-in?error=${encodeURIComponent(error?.message ?? "소셜 로그인을 시작할 수 없습니다.")}`,
    );
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
