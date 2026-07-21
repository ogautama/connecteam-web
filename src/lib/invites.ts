import { Prisma, type PendingInvite, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDescendantUserIds, resolveRecruiter } from "@/lib/recruitTree";

export type RecruiterOption = { id: string; name: string; email: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Deliberately loose: the address only has to survive until Google accepts it
// at sign-in, so this catches obvious typos rather than policing RFC 5322.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

/** Everyone a leader can name as the new member's recruiter. */
export function listRecruiterOptions(): Promise<RecruiterOption[]> {
  return prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

/**
 * The dropdown pick wins; a manually typed invite code is the fallback. An
 * unknown or blank code lands on resolveRecruiter's fallback-to-root instead
 * of hard-failing — the invite still gets created, just under root.
 */
export async function resolveInviteRecruiter(input: {
  recruiterId?: string;
  inviteCode?: string;
}): Promise<string> {
  if (input.recruiterId) {
    const picked = await prisma.user.findUnique({
      where: { id: input.recruiterId },
      select: { id: true },
    });
    if (picked) return picked.id;
  }
  return resolveRecruiter(input.inviteCode?.trim() || undefined);
}

export type CreateInviteResult =
  | { ok: true; invite: PendingInvite }
  | { ok: false; reason: "existing-user" | "existing-invite" };

/**
 * Pre-authorizes an email (Plan 02c). The row sits here until that person
 * completes Google sign-in, at which point on_auth_user_created consumes it
 * into a real User (Plan 02b) — nothing notifies them in the meantime.
 */
export async function createPendingInvite(input: {
  email: string;
  recruiterId: string;
  role: Role;
  invitedBy: string;
}): Promise<CreateInviteResult> {
  const email = normalizeEmail(input.email);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) return { ok: false, reason: "existing-user" };

  const existingInvite = await prisma.pendingInvite.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingInvite) return { ok: false, reason: "existing-invite" };

  try {
    const invite = await prisma.pendingInvite.create({
      data: {
        email,
        recruiterId: input.recruiterId,
        role: input.role,
        invitedBy: input.invitedBy,
      },
    });
    return { ok: true, invite };
  } catch (error) {
    // P2002 = the email unique index. Two leaders inviting the same person at
    // once slip past the check above; the index is the real guard, and the
    // outcome is the same as any other duplicate — an inline error, not a 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "existing-invite" };
    }
    throw error;
  }
}

export type PendingInviteSummary = {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  /** Null when the recruiter's User row has since been deleted. */
  recruiterName: string | null;
  invitedByName: string | null;
  invitedByYou: boolean;
};

/** Whole days since the invite was created — the "still waiting" counter. */
export function daysWaiting(createdAt: Date, now: Date = new Date()): number {
  const elapsed = now.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

/**
 * Every invite still waiting on a first sign-in, anywhere in this leader's
 * branch. There's no status column to read: on_auth_user_created *deletes*
 * the row as it creates the User (Plan 02b), so a row that still exists is
 * exactly "invited, hasn't logged in yet".
 *
 * Scoped by recruiter, since that's who the invitee lands under — and
 * getDescendantUserIds is self-inclusive, so a leader always sees their own.
 * Invites they created themselves are unioned in as well, so putting someone
 * under a recruiter outside the branch doesn't make the invite vanish from
 * the inviter's view.
 */
export async function listPendingInvitesFor(
  leaderId: string
): Promise<PendingInviteSummary[]> {
  const branchIds = await getDescendantUserIds(leaderId);

  const invites = await prisma.pendingInvite.findMany({
    where: {
      OR: [{ recruiterId: { in: branchIds } }, { invitedBy: leaderId }],
    },
    orderBy: { createdAt: "desc" },
  });

  // PendingInvite's recruiterId/invitedBy are plain columns, not relations
  // (they're nullable for the root bootstrap), so the names come from a
  // second lookup rather than an include.
  const referencedIds = [
    ...new Set(
      invites
        .flatMap((invite) => [invite.recruiterId, invite.invitedBy])
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const users = referencedIds.length
    ? await prisma.user.findMany({
        where: { id: { in: referencedIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(users.map((user) => [user.id, user.name]));

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt,
    recruiterName: invite.recruiterId
      ? nameById.get(invite.recruiterId) ?? null
      : null,
    invitedByName: invite.invitedBy
      ? nameById.get(invite.invitedBy) ?? null
      : null,
    invitedByYou: invite.invitedBy === leaderId,
  }));
}
