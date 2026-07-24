import { prisma } from "@/lib/prisma";

/** Every item id this member has checked off, across all levels. */
export async function getCompletedItemIds(userId: string): Promise<string[]> {
  const rows = await prisma.onboardingProgress.findMany({
    where: { userId },
    select: { itemId: true },
  });
  return rows.map((row) => row.itemId);
}

/**
 * Sets one item's completion state. Idempotent either direction — checking
 * an already-checked item or unchecking an already-unchecked one is a no-op,
 * not an error, since the client always sends the state it wants, not a
 * blind toggle (avoids desync if two tabs are open).
 */
export async function setItemCompletion(
  userId: string,
  itemId: string,
  completed: boolean
): Promise<void> {
  if (completed) {
    await prisma.onboardingProgress.upsert({
      where: { userId_itemId: { userId, itemId } },
      update: {},
      create: { userId, itemId },
    });
  } else {
    await prisma.onboardingProgress.deleteMany({ where: { userId, itemId } });
  }
}
