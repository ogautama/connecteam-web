"use server";

import { createLead } from "@/lib/leads";
import { DISC_QUESTIONS, type DiscTrait } from "@/lib/disc/questions";
import { scoreDisc } from "@/lib/disc/score";

// Optional "save your result" step at the end of the DISC test. This is a
// public tool — no auth — so the action validates everything itself: server
// actions are reachable by direct POST, not only through our UI.
export async function saveDiscLead(input: {
  name: string;
  contact: string;
  answers: DiscTrait[];
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

  await createLead({
    source: "disc",
    name,
    contact,
    inputs: { answers: input.answers },
    result,
  });
}
