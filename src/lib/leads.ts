import { prisma } from "@/lib/prisma";
import type { Lead, LeadSource } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getDescendantUserIds } from "@/lib/recruitTree";

export function createLead(input: {
  source: LeadSource;
  name: string;
  contact: string;
  inputs: unknown;
  result: unknown;
  ownerId: string;
  takerUserId?: string;
}): Promise<Lead> {
  return prisma.lead.create({
    data: {
      source: input.source,
      name: input.name,
      contact: input.contact,
      inputs: input.inputs as Prisma.InputJsonValue,
      result: input.result as Prisma.InputJsonValue,
      ownerId: input.ownerId,
      takerUserId: input.takerUserId,
    },
  });
}

// Leads accumulate one row per submission (no upsert) — this is how a
// signed-in member's most recent result gets found again, matched by the
// same `contact` (their account email) the auto-save path writes under.
export function getLatestLead(input: {
  source: LeadSource;
  contact: string;
}): Promise<Lead | null> {
  return prisma.lead.findFirst({
    where: { source: input.source, contact: input.contact },
    orderBy: { createdAt: "desc" },
  });
}

export type LeadWithOwner = Lead & { owner: { id: string; name: string } };

/**
 * `/member/leads` (Plan 16) — scoped in the query itself, never by fetching
 * everything and filtering after: `viewerId` is self-inclusive
 * (getDescendantUserIds), so an agent sees only their own referral link's
 * leads, a leader their whole downline, root everything. `viewerId` must
 * come from the session — never accept it as a request parameter, or the
 * scope stops meaning anything.
 */
export async function getLeadsForViewer(
  viewerId: string,
  source: LeadSource
): Promise<LeadWithOwner[]> {
  const ownerIds = await getDescendantUserIds(viewerId);
  return prisma.lead.findMany({
    where: { source, ownerId: { in: ownerIds } },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, name: true } } },
  });
}

/**
 * Detail view's access check — returns null both when the id doesn't exist
 * and when it exists outside the viewer's subtree, so the route can 404
 * identically either way rather than leaking which ids are real.
 */
export async function getLeadForViewer(
  viewerId: string,
  id: string
): Promise<LeadWithOwner | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true } } },
  });
  if (!lead) return null;

  const ownerIds = await getDescendantUserIds(viewerId);
  if (!ownerIds.includes(lead.ownerId)) return null;

  return lead;
}
