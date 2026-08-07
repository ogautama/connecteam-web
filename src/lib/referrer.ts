import { prisma } from "@/lib/prisma";

/**
 * Display-only resolution of a `?ref=` invite code, for the public DISC page
 * (Plan 22): the visitor arrived on a member's personal link, so the page
 * names them before asking for a phone number.
 *
 * Deliberately narrow, and deliberately *not* `resolveRecruiter()`:
 *
 * - **First name only.** This is a public, unauthenticated page turning a
 *   guessable code into a member's identity. One token of `User.name` is
 *   enough to make the ask feel personal; the full name, the email and the
 *   photo are not on offer. `select: { name: true }` is the whole lookup.
 * - **Null on an unknown code**, so the caller falls back to the brand
 *   treatment silently. Erroring — or saying anything different — would
 *   confirm which codes exist.
 * - **Separate from ownership.** `resolveRecruiter()` returns the root leader
 *   for an unknown code, which is correct for who owns the lead and wrong for
 *   whose name is printed: it would name the root leader on every bad link.
 */
export async function getReferrerFirstName(
  inviteCode?: string
): Promise<string | null> {
  if (!inviteCode) return null;

  const user = await prisma.user.findUnique({
    where: { inviteCode },
    select: { name: true },
  });

  const firstName = user?.name?.trim().split(/\s+/)[0];
  return firstName || null;
}
