import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client (service_role key). BYPASSES Row Level Security.
 *
 * SECURITY-CRITICAL:
 *  - `import "server-only"` makes this module a build error if it is ever
 *    imported into client-side code.
 *  - Only use from trusted server contexts (extraction worker, aggregate admin
 *    metrics) where an explicit authorization check has already been performed.
 *  - Never expose the service_role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
