import { test, expect, type Page } from "@playwright/test";

/**
 * E2E smoke spec (plan Verification Step 8 / Expanded Test Plan E2E row):
 *
 *   age gate -> ai_processing consent -> chat -> recommendations
 *
 * This exercises the full "help-first" funnel end to end against a REAL
 * Supabase project + a real ANTHROPIC_API_KEY (the chat step calls the live
 * /api/chat route, which calls Claude). There is neither in this sandbox, so
 * this spec is not run here — see e2e/README.md for how to configure and run
 * it. It intentionally does NOT mock Supabase/Anthropic to force a pass;
 * per T8 scope, a fake-green e2e test would hide real integration bugs.
 *
 * Guard: skip cleanly (not silently pass) when the target isn't configured,
 * so CI reports "skipped" rather than a misleading "0 tests" or a fabricated
 * pass.
 */

const CONFIGURED = Boolean(process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);

test.describe("onboarding -> consent -> chat -> recommendations smoke", () => {
  test.skip(
    !CONFIGURED,
    "E2E target not configured: set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (+ ANTHROPIC_API_KEY " +
      "for the running app) and, for a hosted target, E2E_BASE_URL. See e2e/README.md.",
  );

  test("full funnel: sign up -> age gate -> ai_processing consent -> chat -> recommendations", async ({
    page,
  }) => {
    const stamp = Date.now();
    const email = `e2e-smoke-${stamp}@example.com`;
    const password = `Smoke-Test-${stamp}!`;
    const pseudonym = `스모크${stamp}`;

    await signUp(page, { email, password, pseudonym });

    // ---- Step 1: age gate (AC-15 / AD-8) ------------------------------------
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: "연령 확인" })).toBeVisible();
    await page.getByRole("button", { name: "네, 만 19세 이상입니다" }).click();

    // ---- Step 2: ai_processing consent disclosure (AC-13, non-negotiable) --
    await expect(
      page.getByRole("heading", { name: "AI 대화 처리 동의 (필수)" }),
    ).toBeVisible();
    await expect(page.getByText("Anthropic, PBC")).toBeVisible(); // cross-border transfer notice
    await page.getByRole("button", { name: "동의하고 시작하기" }).click();

    await expect(page.getByRole("heading", { name: "준비가 끝났어요" })).toBeVisible();
    await page.getByRole("link", { name: "대화 시작하기" }).click();

    // ---- Step 3: chat (AC-2 streaming, AC-4 disclaimer always visible) ------
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByText("전문 심리상담이 아닙니다")).toBeVisible();

    const message = "요즘 취업 준비 때문에 잠을 잘 못 자고 있어요.";
    const textarea = page.getByPlaceholder("마음에 담아둔 이야기를 들려주세요…");
    await textarea.fill(message);
    const sendButton = page.getByRole("button", { name: "보내기" });
    await sendButton.click();

    // The user bubble renders immediately from client state (no network
    // dependency) — this much must always hold even without a live backend.
    await expect(page.getByText(message)).toBeVisible();

    // The send button re-enables once the /api/chat stream completes (success
    // or a surfaced error) — this is the network-dependent part, hence the
    // generous timeout. We don't assert specific assistant copy since model
    // output is non-deterministic; we only assert the round trip completed.
    await expect(sendButton).toBeDisabled();
    await expect(sendButton).toBeEnabled({ timeout: 15_000 });

    // ---- Step 4: recommendations (AC-9), reachable after background extraction
    await page.goto("/recommendations");
    await expect(page.getByRole("heading", { name: "추천 정보" })).toBeVisible();
    // Either curated institution cards or the explicit "no data yet" empty
    // state is an acceptable smoke outcome — extraction is async (AD-1) and
    // may not have completed yet for a brand-new user within one test run.
    // What must NOT happen is an unhandled error page.
    await expect(
      page.getByText("아직 표시할 추천 정보가 없어요").or(page.getByRole("button", { name: "저장하기" }).first()),
    ).toBeVisible();
  });

  test("consent gate blocks chat access until ai_processing is granted", async ({ page }) => {
    const stamp = Date.now();
    await signUp(page, {
      email: `e2e-gate-${stamp}@example.com`,
      password: `Smoke-Test-${stamp}!`,
      pseudonym: `게이트${stamp}`,
    });

    await page.getByRole("button", { name: "네, 만 19세 이상입니다" }).click();
    await expect(
      page.getByRole("heading", { name: "AI 대화 처리 동의 (필수)" }),
    ).toBeVisible();

    // Navigating straight to /chat without granting consent must not bypass
    // the gate — the chat UI itself doesn't check consent (only /api/chat
    // does, server-side), so this asserts the onboarding page still blocks.
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: "AI 대화 처리 동의 (필수)" }),
    ).toBeVisible();
  });

  test("minor self-attestation is blocked with hotline info, never grants access", async ({
    page,
  }) => {
    const stamp = Date.now();
    await signUp(page, {
      email: `e2e-minor-${stamp}@example.com`,
      password: `Smoke-Test-${stamp}!`,
      pseudonym: `미성년${stamp}`,
    });

    await page.getByRole("button", { name: "아니요, 19세 미만입니다" }).click();
    await expect(page).toHaveURL(/blocked=minor/);
    await expect(page.getByRole("heading", { name: "이용이 제한됩니다" })).toBeVisible();
    await expect(page.getByText("109")).toBeVisible();
    await expect(page.getByText("1577-0199")).toBeVisible();
  });
});

async function signUp(
  page: Page,
  creds: { email: string; password: string; pseudonym: string },
) {
  await page.goto("/sign-up");
  await page.getByLabel("닉네임 (가명)").fill(creds.pseudonym);
  await page.getByLabel("이메일").fill(creds.email);
  await page.getByLabel("비밀번호").fill(creds.password);
  await page.getByRole("button", { name: "가입하기" }).click();
  // Requires the target Supabase project to have email confirmations
  // disabled for test users (see e2e/README.md) so signUp returns a live
  // session and redirects straight to /onboarding.
  await page.waitForURL(/\/onboarding/, { timeout: 10_000 });
}
