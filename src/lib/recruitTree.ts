import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Self-inclusive: a user is always a "descendant" of itself, so
 * `canAccess`/visibility checks can just test membership in this set.
 */
export async function getDescendantUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH RECURSIVE descendants AS (
      SELECT id, "recruiterId" FROM "User" WHERE id = ${userId}
      UNION ALL
      SELECT u.id, u."recruiterId"
      FROM "User" u
      INNER JOIN descendants d ON u."recruiterId" = d.id
    )
    SELECT id FROM descendants
  `);
  return rows.map((row) => row.id);
}

export async function canAccess(
  viewerId: string,
  ownerId: string
): Promise<boolean> {
  if (viewerId === ownerId) return true;
  const descendantIds = await getDescendantUserIds(viewerId);
  return descendantIds.includes(ownerId);
}

export async function resolveRecruiter(inviteCode?: string): Promise<string> {
  if (inviteCode) {
    const invited = await prisma.user.findUnique({ where: { inviteCode } });
    if (invited) return invited.id;
  }
  const root = await prisma.user.findFirst({ where: { recruiterId: null } });
  if (!root) {
    throw new Error("resolveRecruiter: no root user (recruiterId = null) found");
  }
  return root.id;
}

async function assertNoCycle(
  targetId: string,
  newRecruiterId: string
): Promise<void> {
  let currentId: string | null = newRecruiterId;
  while (currentId) {
    if (currentId === targetId) {
      throw new Error(
        "reassignRecruiter: would create a cycle in the recruiter tree"
      );
    }
    const current: { recruiterId: string | null } | null =
      await prisma.user.findUnique({
        where: { id: currentId },
        select: { recruiterId: true },
      });
    currentId = current?.recruiterId ?? null;
  }
}

export async function reassignRecruiter(
  targetId: string,
  newRecruiterId: string
): Promise<void> {
  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (targetUser) {
    await assertNoCycle(targetId, newRecruiterId);
    await prisma.user.update({
      where: { id: targetId },
      data: { recruiterId: newRecruiterId },
    });
    return;
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: targetId },
  });
  if (applicant) {
    await prisma.applicant.update({
      where: { id: targetId },
      data: { recruiterId: newRecruiterId },
    });
    return;
  }

  throw new Error(
    `reassignRecruiter: no User or Applicant found with id ${targetId}`
  );
}

