"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createLead } from "@/lib/leads";
import { type MemberIntakeInput, upsertMemberIntake } from "@/lib/memberIntake";
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
 * "Isi Data" — the personal-data intake form (Plan 07). Submitting it also
 * marks the checklist item done, so there's no separate manual checkbox
 * step once the real data is saved. "Unit Pengundang" isn't part of the
 * input: it's derived from the caller's own recruiterId, not something the
 * member can set themselves.
 */
export async function submitJoinData(input: MemberIntakeInput): Promise<void> {
  const user = await requireMember();

  const trimmed: MemberIntakeInput = {
    ktpNumber: input.ktpNumber.trim(),
    birthDate: input.birthDate.trim(),
    phone: input.phone.trim(),
    bankAccount: input.bankAccount.trim(),
    npwp: input.npwp.trim(),
  };

  if (!trimmed.ktpNumber) throw new Error("Nomor KTP wajib diisi.");
  if (!trimmed.birthDate || Number.isNaN(Date.parse(trimmed.birthDate))) {
    throw new Error("Tanggal lahir wajib diisi.");
  }
  if (!trimmed.phone) throw new Error("Nomor HP wajib diisi.");
  if (!trimmed.bankAccount) throw new Error("Nomor rekening bank wajib diisi.");
  if (!trimmed.npwp) throw new Error("NPWP wajib diisi.");

  await upsertMemberIntake(user.id, trimmed);
  await setItemCompletion(user.id, "join-isi-data", true);
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
  });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(TEST_RESULT_BUCKET)
    .createSignedUrl(input.storagePath, 60 * 10);

  revalidatePath("/member/onboarding");
  return { typed, screenshotUrl: data?.signedUrl ?? null };
}
