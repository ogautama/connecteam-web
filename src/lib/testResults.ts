// Shared between the client uploader (TestResultUpload.tsx) and the server
// (actions.ts, testResultState.ts) — plain constants/helpers only, no
// server-only imports, so it's safe to bundle into the browser.

export const TEST_RESULT_BUCKET = "test-results";

export type TestResultSource = "mbti" | "selfMotivation";

/**
 * One current screenshot per member per test — re-uploading overwrites the
 * previous file at the same path (see the bucket's RLS policy, which scopes
 * writes to "<own userId>/...").
 */
export function testResultStoragePath(
  userId: string,
  source: TestResultSource,
  ext: string
): string {
  return `${userId}/${source}.${ext}`;
}
