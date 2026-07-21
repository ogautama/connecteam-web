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

export default async function proxy(request: NextRequest) {
  // Mutated by the Supabase client's setAll below so the refreshed auth
  // cookies ride along on the response that's actually returned.
  let response = NextResponse.next({ request });

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
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    authState = profile ? "authenticated" : "no-profile";
  }

  const decision = decideProxyResponse(authState, request.nextUrl);
  return decision ?? response;
}

export const config = {
  matcher: ["/member/:path*"],
};
