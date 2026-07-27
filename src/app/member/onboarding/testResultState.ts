import { getLatestLead } from "@/lib/leads";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TEST_RESULT_BUCKET, type TestResultSource } from "@/lib/testResults";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export type TestResultState = { typed: string; screenshotUrl: string | null };

/** The signed-in member's most recent saved MBTI/Self Motivation result, if any. */
export async function getTestResultState(
  contact: string,
  source: TestResultSource
): Promise<TestResultState | null> {
  const lead = await getLatestLead({ source, contact });
  if (!lead) return null;

  const inputs = lead.inputs as { typed?: string };
  const result = lead.result as { storagePath?: string };
  if (!result.storagePath) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(TEST_RESULT_BUCKET)
    .createSignedUrl(result.storagePath, SIGNED_URL_TTL_SECONDS);

  return { typed: inputs.typed ?? "", screenshotUrl: data?.signedUrl ?? null };
}
