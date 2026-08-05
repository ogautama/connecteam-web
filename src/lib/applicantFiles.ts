// Shared between the client uploader (ApplicationForm.tsx) and the server
// (actions.ts, applicant.ts) — plain constants/helpers only, no
// server-only imports, so it's safe to bundle into the browser.

export const APPLICANT_INTAKE_BUCKET = "applicant-intake";

export type ApplicantFileField =
  | "ktp"
  | "selfie"
  | "familyCard"
  | "savings"
  | "spouse";

/**
 * There's no userId to scope by — the applicant has no account yet — so
 * every submission gets its own random prefix instead, generated client-side
 * once per form fill (crypto.randomUUID()). All 5 files of one submission
 * share it; submitApplication checks they all agree before persisting.
 */
export function applicantStoragePath(
  submissionId: string,
  field: ApplicantFileField,
  ext: string
): string {
  return `${submissionId}/${field}.${ext}`;
}
