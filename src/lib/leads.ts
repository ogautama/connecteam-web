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
