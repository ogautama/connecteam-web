// Shared between the client form (JoinDataForm.tsx) and the server
// (actions.ts) — plain constants only (the EducationLevel import is
// type-only, erased at compile time, so this stays safe to bundle into the
// browser without dragging in Prisma's runtime).
//
// "Pengundang / Unit" isn't here: it's not a fixed list like education —
// it's the live set of leader names, fetched via getPengundangUnitOptions()
// in @/lib/memberIntake.

import type { EducationLevel } from "@prisma/client";

export const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "smaSltaSmk", label: "SMA / SLTA / SMK" },
  // Not in the source Google Form — added deliberately 2026-08-06 (Plan 20),
  // so from here the list is no longer a strict transcription.
  { value: "diploma", label: "Diploma (D1–D4)" },
  { value: "s1", label: "S1" },
  { value: "s2", label: "S2" },
  { value: "s3", label: "S3" },
];
