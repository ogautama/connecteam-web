import { prisma } from "@/lib/prisma";

export type MemberIntakeInput = {
  ktpNumber: string;
  birthDate: string; // "YYYY-MM-DD", matches <input type="date">
  phone: string;
  bankAccount: string;
  npwp: string;
};

export type MemberIntakeRecord = MemberIntakeInput;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getMemberIntake(
  userId: string
): Promise<MemberIntakeRecord | null> {
  const row = await prisma.memberIntake.findUnique({ where: { userId } });
  if (!row) return null;

  return {
    ktpNumber: row.ktpNumber,
    birthDate: toDateOnly(row.birthDate),
    phone: row.phone,
    bankAccount: row.bankAccount,
    npwp: row.npwp,
  };
}

export async function upsertMemberIntake(
  userId: string,
  input: MemberIntakeInput
): Promise<void> {
  const data = {
    ktpNumber: input.ktpNumber,
    birthDate: new Date(input.birthDate),
    phone: input.phone,
    bankAccount: input.bankAccount,
    npwp: input.npwp,
  };

  await prisma.memberIntake.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

/** "Unit Pengundang" — the name of the leader who invited this member,
 * looked up live from User.recruiterId rather than copied onto the intake
 * row, so a later reassignment (reassignRecruiter) can't leave it stale.
 * Null only for the root user, who has no recruiter. */
export async function getUnitPengundang(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { recruiter: { select: { name: true } } },
  });
  return user?.recruiter?.name ?? null;
}
