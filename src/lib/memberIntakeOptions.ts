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
  { value: "s1", label: "S1" },
  { value: "s2", label: "S2" },
  { value: "s3", label: "S3" },
];
