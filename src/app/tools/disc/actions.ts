"use server";

import { createLead } from "@/lib/leads";
import { DISC_QUESTIONS, type DiscTrait } from "@/lib/disc/questions";
import { scoreDisc } from "@/lib/disc/score";
import { getCurrentUser } from "@/lib/auth";
import { resolveRecruiter } from "@/lib/recruitTree";

// Optional "save your result" step at the end of the DISC test. This is a
// public tool — no auth — so the action validates everything itself: server
// actions are reachable by direct POST, not only through our UI.
//
// Attribution (Plan 16) is resolved here, server-side, never trusted from
// the client: a signed-in member is always both owner and taker of their
// own result (a `ref` in the URL, if any, is ignored — opening someone
// else's referral link doesn't make the result theirs); an anonymous
// submitter's lead is owned by whoever `ref` resolves to, falling back to
// the root leader for an absent or unknown code (resolveRecruiter's
// existing behaviour).
export async function saveDiscLead(input: {
  name: string;
  contact: string;
  answers: DiscTrait[];
  ref?: string;
}): Promise<void> {
  const name = input.name?.trim() ?? "";
  const contact = input.contact?.trim() ?? "";

  if (!name || !contact) {
    throw new Error("Nama dan nomor WhatsApp wajib diisi.");
  }
  if (!Array.isArray(input.answers) || input.answers.length !== DISC_QUESTIONS.length) {
    throw new Error("Jawaban tes belum lengkap.");
  }

  // Re-scored here rather than trusting a result posted by the client.
  const result = scoreDisc(input.answers);

  const user = await getCurrentUser();
  const ownerId = user ? user.id : await resolveRecruiter(input.ref);

  await createLead({
    source: "disc",
    name,
    contact,
    inputs: { answers: input.answers },
    result,
    ownerId,
    takerUserId: user?.id,
  });
}
