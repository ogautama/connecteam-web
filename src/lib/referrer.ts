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

// Recruiter chains are short (it's an org tree); the cap turns hypothetical
// cycle corruption into a null instead of a hang. Same reasoning, same number
// as `getPengundangUnitForMember`.
const MAX_HOPS = 20;

/**
 * The "Pengundang / Unit" a prospect referred by `inviteCode` should name on
 * the join form — printed on the DISC share card (Plan 23) next to the plain
 * URL, so someone who types the link instead of scanning the QR still lands in
 * the right unit.
 *
 * Full name, not a first name, and deliberately so: the value has to match a
 * `/join` picklist entry exactly, and that picklist
 * (`getPengundangUnitOptions`) already publishes every leader's full name on a
 * public page. This widens nothing — it just saves the visitor from guessing
 * which of those names is theirs.
 *
 * "At or above" the referrer, which is where this differs from
 * `getPengundangUnitForMember` (that one starts at the *recruiter*, because a
 * member's own unit is never themselves). A leader who shares their own link
 * is their own unit.
 */
export async function getReferrerUnitName(
  inviteCode?: string
): Promise<string | null> {
  if (!inviteCode) return null;

  const referrer = await prisma.user.findUnique({
    where: { inviteCode },
    select: { id: true, name: true, role: true, recruiterId: true },
  });
  if (!referrer) return null;

  let current: { name: string; role: string; recruiterId: string | null } =
    referrer;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (current.role === "leader") return current.name.trim() || null;
    if (!current.recruiterId) return null;

    const next = await prisma.user.findUnique({
      where: { id: current.recruiterId },
      select: { name: true, role: true, recruiterId: true },
    });
    if (!next) return null;
    current = next;
  }

  return null;
}
