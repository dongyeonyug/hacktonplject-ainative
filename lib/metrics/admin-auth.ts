import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Admin authz gate for the aggregate-only metrics dashboard (plan AD-5:
 * "관리자 대시보드... service-role 뒤 admin-authz 체크(별도 admin 역할 클레임),
 * `auth.uid()` RLS 아님").
 *
 * Mechanism: an `ADMIN_EMAILS` env allowlist (comma-separated, case-insensitive
 * email addresses), checked in application code against the signed-in user's
 * session email. This is deliberately NOT a Postgres RLS policy — there is no
 * `admin` role/claim in the schema, and `difficulty_data`/`extraction_status`
 * RLS stays scoped to `user_id = auth.uid()` / service-role-only respectively
 * (0001_init.sql). The dashboard itself reads via `createAdminClient()`
 * (service_role, bypasses RLS) only AFTER this allowlist check passes.
 *
 * A signed-in user who is not on the allowlist must be treated identically to
 * an unauthenticated one by the caller (typically `notFound()`), so the route
 * is not reachable by ordinary logged-in users.
 */

function parseAdminEmails(): ReadonlySet<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Returns the signed-in Supabase user IF they are on the ADMIN_EMAILS
 * allowlist, otherwise `null`. Uses the cookie-based, RLS-respecting
 * `createClient()` (not the admin/service-role client) to establish identity
 * — only the authz decision is app-level, not the session itself.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
