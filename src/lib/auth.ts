import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>>
): Promise<Omit<User, "passwordHash"> | null> {
  const email = credentials.email;
  const password = credentials.password;
  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "active") return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure-to-omit
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Re-checks `status` on every request (not just at sign-in) and returns
 * null to clear the session cookie — see node_modules/@auth/core/lib/actions/session.js,
 * `token !== null` gate — for a deactivated user, `null` here is what makes
 * revocation take effect on their very next request instead of waiting for
 * the JWT to expire.
 */
export async function refreshOrRevokeToken(
  token: JWT,
  user: { id: string; role: Role } | undefined
): Promise<JWT | null> {
  if (user) {
    token.sub = user.id;
    token.role = user.role;
    return token;
  }

  if (!token.sub) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
  if (!dbUser || dbUser.status !== "active") return null;

  token.role = dbUser.role;
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Auth.js only supports the Credentials provider with JWT sessions (it
  // throws otherwise — Credentials-authenticated users aren't persisted
  // through the adapter, so there's no adapter session row to attach to).
  // Immediate revocation on deactivation is instead handled in the jwt()
  // callback below, which re-checks status on every request and returns
  // null to clear the cookie — same guarantee as a database session.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) =>
      refreshOrRevokeToken(token, user as { id: string; role: Role } | undefined),
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});

/** Marks a user inactive; their next request re-checks status in jwt() and is signed out. */
export async function deactivateUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { status: "inactive" },
  });
}

export function roleRedirectTarget(
  session: Session | null,
  role: Role
): "/login" | "/member" | null {
  if (!session?.user) return "/login";
  if (session.user.role !== role) return "/member";
  return null;
}

/** For leader-only pages: redirects to /login if unauthenticated, /member if wrong role. */
export async function requireRole(role: Role) {
  const session = await auth();
  const target = roleRedirectTarget(session, role);
  if (target) redirect(target);
  return session;
}
