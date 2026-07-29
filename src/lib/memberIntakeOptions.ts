// Shared between the client form (JoinDataForm.tsx) and the server
// (actions.ts) — plain constants only (the EducationLevel import is
// type-only, erased at compile time, so this stays safe to bundle into the
// browser without dragging in Prisma's runtime).

import type { EducationLevel } from "@prisma/client";

export const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "smaSltaSmk", label: "SMA / SLTA / SMK" },
  { value: "s1", label: "S1" },
  { value: "s2", label: "S2" },
  { value: "s3", label: "S3" },
];

/**
 * "Pengundang / Unit" — copied verbatim from the source Google Form's radio
 * options. That form is otherwise gated behind a sign-in wall (see the
 * "Member content source is gated" project memory), so this list is
 * transcribed from a screenshot the user provided, not fabricated.
 */
export const PENGUNDANG_UNIT_OPTIONS = [
  "Robert / Lini",
  "Haryo / Daisy",
  "Olivia Gautama",
  "Jessica Sugiharto",
  "Austin / Widya",
  "Caroline / Marsha",
] as const;

export type PengundangUnit = (typeof PENGUNDANG_UNIT_OPTIONS)[number];
