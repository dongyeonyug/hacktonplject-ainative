import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client (anon key) for Server Components, Route Handlers, and
 * Server Actions. Reads/writes the auth session via Next.js cookies so RLS runs
 * as the signed-in user (`auth.uid()`). Does NOT bypass RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` may be called from a Server Component where cookies are
            // read-only. Session refresh is handled by middleware in that case.
          }
        },
      },
    },
  );
}
