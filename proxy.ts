import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * AC-13 app-layer enforcement: /chat cannot be reached without an
 * authenticated session AND an active `ai_processing` consent grant. Also
 * refreshes the Supabase session cookies on every request (standard @supabase/ssr
 * middleware pattern) so Server Components see a valid session.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) revalidates against the auth server rather
  // than trusting the cookie blindly.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const guardsChat = path === "/chat" || path.startsWith("/chat/");

  if (guardsChat) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    const { data: consents } = await supabase
      .from("current_consents")
      .select("action")
      .eq("scope", "ai_processing");
    const hasAiProcessingConsent = consents?.some((c) => c.action === "grant") ?? false;

    if (!hasAiProcessingConsent) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every route except static assets/PWA files, so the auth session
    // cookie stays refreshed everywhere and /chat is always gated.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
