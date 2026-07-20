// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (function
// still runs before the request completes, now on the Node.js runtime by
// default instead of Edge — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export function decideProxyResponse(
  hasAuth: boolean,
  nextUrl: URL
): NextResponse | undefined {
  if (!hasAuth && nextUrl.pathname.startsWith("/member")) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  return undefined;
}

export default auth((req) => decideProxyResponse(!!req.auth, req.nextUrl));

export const config = {
  matcher: ["/member/:path*"],
};
