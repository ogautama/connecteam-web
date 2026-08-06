// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (function
// still runs before the request completes, now on the Node.js runtime by
// default instead of Edge — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type ProxyAuthState = "unauthenticated" | "no-profile" | "authenticated";

/**
 * Pure redirect decision, kept separate from the Supabase/Prisma calls
 * below so it stays unit-testable without a live DB connection — mirrors
 * the pre-Supabase proxy.ts's decideProxyResponse.
 */
export function decideProxyResponse(
  authState: ProxyAuthState,
  nextUrl: URL
): NextResponse | undefined {
  if (!nextUrl.pathname.startsWith("/member")) return undefined;
  if (authState === "unauthenticated") {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  if (authState === "no-profile") {
    return NextResponse.redirect(new URL("/not-invited", nextUrl));
  }
  return undefined;
}

/** Does this request carry a Supabase session at all? */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.includes("-auth-token"));
}

export default async function proxy(request: NextRequest) {
  // Mutated by the Supabase client's setAll below so the refreshed auth
  // cookies ride along on the response that's actually returned.
  let response = NextResponse.next({ request });

  const gated = request.nextUrl.pathname.startsWith("/member");

  // Anonymous visitors — most of the public site's traffic — carry no
  // Supabase cookie, so there's nothing to refresh and no profile to look
  // up. Skip both round trips rather than paying for them on every
  // marketing page now that the matcher below is site-wide.
  if (!hasAuthCookie(request)) {
    return decideProxyResponse("unauthenticated", request.nextUrl) ?? response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let authState: ProxyAuthState = "unauthenticated";
  if (user) {
    // Outside `/member/**` the profile lookup can't change the response
    // (decideProxyResponse only gates that prefix), so don't spend a query
    // on it — this runs on every page now, and the reason it does is the
    // cookie refresh above, not the gate.
    const profile = gated
      ? await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true },
        })
      : { id: user.id };
    authState = profile ? "authenticated" : "no-profile";
  }

  const decision = decideProxyResponse(authState, request.nextUrl);
  if (!decision) return response;

  // Carry any cookies `setAll` refreshed onto the redirect. Returning
  // `decision` bare would drop them, stranding the browser with a refresh
  // token Supabase already revoked when it rotated — the next request then
  // fails auth for real and the member has to sign in again.
  response.cookies.getAll().forEach((cookie) => decision.cookies.set(cookie));
  return decision;
}

export const config = {
  matcher: [
    /*
     * Site-wide, not just `/member/**`. Supabase rotates the refresh token
     * when the access token expires and revokes the old one immediately, so
     * whichever request triggers that rotation *must* be able to write the
     * new cookies back. A Server Component render can't (see
     * supabase-server.ts's swallowed setAll), and the public pages that call
     * getCurrentUser() — `/`, `/join`, `/tools/disc` — are exactly where a
     * returning member lands first. Refresh here or lose the session.
     *
     * Excluded: Next internals and static assets, plus `/auth/**` — the
     * OAuth callback runs its own code exchange and owns those cookie
     * writes; refreshing the pre-exchange session underneath it would be
     * writing stale tokens over fresh ones.
     */
    "/((?!_next/static|_next/image|auth/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
