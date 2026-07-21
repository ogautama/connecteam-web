import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Browser auth actions live in a client-safe module (no Prisma/next/headers);
// re-exported here so `@/lib/auth` stays the single Plan 02b auth entry point.
export { signInWithGoogle, signOut } from "@/lib/auth-browser";

export type CurrentUser = { id: string; name: string; role: Role };

/** The raw Supabase session user, or null if unauthenticated. */
export async function getSession(): Promise<SupabaseUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getProfile(userId: string): Promise<CurrentUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    // `name` comes from Google's full_name via the on_auth_user_created
    // trigger — the member shell greets the user with it (Plan 06).
    select: { id: true, name: true, role: true },
  });
}

/**
 * Session + a public.User lookup by id — this is where "authenticated but
 * never invited" (no trigger-created profile row, see the
 * on_auth_user_created migration) resolves to null, not a user.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  return getProfile(session.id);
}

/**
 * Pure decision, kept separate from the Supabase/Prisma calls in
 * requireMember below so it stays unit-testable without mocking `redirect`.
 */
export function requireMemberTarget(
  session: SupabaseUser | null,
  profile: CurrentUser | null
): "/login" | "/not-invited" | null {
  if (!session) return "/login";
  if (!profile) return "/not-invited";
  return null;
}

/** Same, for the role-gated pages requireRole guards. */
export function requireRoleTarget(
  session: SupabaseUser | null,
  profile: CurrentUser | null,
  role: Role
): "/login" | "/not-invited" | "/member" | null {
  const memberTarget = requireMemberTarget(session, profile);
  if (memberTarget) return memberTarget;
  if (profile && profile.role !== role) return "/member";
  return null;
}

/**
 * Any signed-in member, either role — the guard `/member/**` pages run
 * (proxy.ts makes the same call at the edge of the request; this is the
 * in-page half of that, and the only one that can hand the page a user).
 */
export async function requireMember(): Promise<CurrentUser> {
  const session = await getSession();
  const profile = session ? await getProfile(session.id) : null;

  const target = requireMemberTarget(session, profile);
  if (target) redirect(target);

  return profile as CurrentUser;
}

/**
 * Leader/agent-only pages: unauthenticated -> /login, authenticated but no
 * profile (never invited) -> /not-invited, wrong role -> /member.
 */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const session = await getSession();
  const profile = session ? await getProfile(session.id) : null;

  const target = requireRoleTarget(session, profile, role);
  if (target) redirect(target);

  return profile as CurrentUser;
}
