"use server";

// IRON RULE (premium-engine README §"server-only"): anything importing
// "@ogautama/premium-engine/server" or "/pdf" must live in a server-only
// file — a "use server" action like this one, or a server component. The
// /server entry carries the full rate tables, which must never reach a
// client bundle. This repo has no automated lint rule for that boundary;
// it is enforced by code review.

import {
  handlePremiumRequest,
  type HandledPremiumResponse,
} from "@ogautama/premium-engine/server";
import { getCurrentUser } from "@/lib/auth";

// Member-only by decision (Plan 05a): this is an agent tool for pricing
// real products, with no anonymous path — unlike the public DISC action.
//
// Validation and pricing both belong to the engine: the raw body goes to
// handlePremiumRequest as-is, and its response — priced result or its
// 400/422 error shape — comes back as-is. No Lead is written here; lead
// capture needs a client name/contact, which only exists in 05c's quote
// step.
export async function requestPremium(
  body: unknown
): Promise<HandledPremiumResponse> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Harus masuk sebagai member untuk menghitung premi.");
  }

  return handlePremiumRequest(body, new Date());
}
