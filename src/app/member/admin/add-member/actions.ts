"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import {
  createPendingInvite,
  isValidEmail,
  normalizeEmail,
  resolveInviteRecruiter,
} from "@/lib/invites";

export type AddMemberState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; email: string };

function parseRole(value: FormDataEntryValue | null): Role {
  return value === "leader" ? "leader" : "agent";
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Creates the PendingInvite a new member needs before they can sign in at all
 * (Plan 02c). Server Actions are reachable by direct POST, not only through
 * our form, so the leader check and the validation both run here — the page's
 * own guard can't be the only one.
 */
export async function addMember(
  _prev: AddMemberState,
  formData: FormData
): Promise<AddMemberState> {
  const leader = await requireRole("leader");

  const email = text(formData.get("email"));
  if (!email) {
    return { status: "error", message: "Email wajib diisi." };
  }
  if (!isValidEmail(email)) {
    return { status: "error", message: "Format emailnya belum bener." };
  }

  const recruiterId = await resolveInviteRecruiter({
    leaderId: leader.id,
    recruiterId: text(formData.get("recruiterId")) || undefined,
    inviteCode: text(formData.get("inviteCode")) || undefined,
  });

  const result = await createPendingInvite({
    email,
    recruiterId,
    role: parseRole(formData.get("role")),
    invitedBy: leader.id,
  });

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "existing-user"
          ? "Email ini udah punya akun. Nggak perlu diundang lagi."
          : "Email ini udah diundang dan tinggal nunggu dia sign in.",
    };
  }

  // Puts the new invite in the "Belum Login" list right away — the page is
  // rendered on the server, so without this the leader would only see it
  // after a manual reload.
  revalidatePath("/member/admin/add-member");

  return { status: "success", email: normalizeEmail(email) };
}
