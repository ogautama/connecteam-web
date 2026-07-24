"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { setItemCompletion } from "@/lib/onboardingProgress";

/**
 * Server Actions are reachable by direct POST, not only through the hub's
 * checkboxes — requireMember() here is what actually scopes every write to
 * the calling member, the client-supplied itemId is otherwise untrusted.
 */
export async function setOnboardingItemCompletion(
  itemId: string,
  completed: boolean
): Promise<void> {
  const user = await requireMember();
  await setItemCompletion(user.id, itemId, completed);
  revalidatePath("/member/onboarding");
}
