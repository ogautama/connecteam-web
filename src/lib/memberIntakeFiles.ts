// Shared between the client uploader (JoinDataForm.tsx) and the server
// (actions.ts, memberIntake.ts) — plain constants/helpers only, no
// server-only imports, so it's safe to bundle into the browser.

export const MEMBER_INTAKE_BUCKET = "member-intake";

export type MemberIntakeFileField =
  | "ktp"
  | "selfie"
  | "familyCard"
  | "savings"
  | "spouse";

/**
 * One current file per member per field — re-uploading overwrites the
 * previous file at the same path (see the bucket's RLS policy, which scopes
 * writes to "<own userId>/...").
 */
export function memberIntakeStoragePath(
  userId: string,
  field: MemberIntakeFileField,
  ext: string
): string {
  return `${userId}/${field}.${ext}`;
}
