"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createLead } from "@/lib/leads";
import { setItemCompletion } from "@/lib/onboardingProgress";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TEST_RESULT_BUCKET, type TestResultSource } from "@/lib/testResults";
import type { TestResultState } from "./testResultState";

/**
 * Server Actions are reachable by direct POST, not only through the hub's
 * checkboxes — requireMember() here is what actually scopes every write to
 * the calling member, the client-supplied itemId is otherwise untrusted.
 */
export async function setOnboardingItemCompletion(
  itemId: string,
  completed: boolean
): Promise<void> {
  const user = await requireMember();
  await setItemCompletion(user.id, itemId, completed);
  revalidatePath("/member/onboarding");
}

/**
 * Records an MBTI/Self Motivation result after the client has already
 * uploaded the screenshot straight to Supabase Storage (that upload is what
 * actually enforces "only into your own folder", via the bucket's RLS
 * policy) — this just persists the typed summary + a pointer to it. The
 * storagePath prefix check below is a sanity guard, not the real gate.
 */
export async function saveTestResultLead(input: {
  source: TestResultSource;
  typed: string;
  storagePath: string;
}): Promise<TestResultState> {
  const user = await requireMember();
  const typed = input.typed?.trim() ?? "";

  if (!typed) {
    throw new Error("Isi hasil tesnya dulu ya.");
  }
  if (!input.storagePath.startsWith(`${user.id}/`)) {
    throw new Error("Screenshot belum berhasil diupload.");
  }

  await createLead({
    source: input.source,
    name: user.name,
    contact: user.email,
    inputs: { typed },
    result: { storagePath: input.storagePath },
    ownerId: user.id,
    takerUserId: user.id,
  });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(TEST_RESULT_BUCKET)
    .createSignedUrl(input.storagePath, 60 * 10);

  revalidatePath("/member/onboarding");
  return { typed, screenshotUrl: data?.signedUrl ?? null };
}
