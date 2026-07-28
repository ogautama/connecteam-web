import { prisma } from "@/lib/prisma";
import type { Lead, LeadSource } from "@prisma/client";
import { Prisma } from "@prisma/client";

export function createLead(input: {
  source: LeadSource;
  name: string;
  contact: string;
  inputs: unknown;
  result: unknown;
}): Promise<Lead> {
  return prisma.lead.create({
    data: {
      source: input.source,
      name: input.name,
      contact: input.contact,
      inputs: input.inputs as Prisma.InputJsonValue,
      result: input.result as Prisma.InputJsonValue,
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
