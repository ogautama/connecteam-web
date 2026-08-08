import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import CalculatorForm from "./CalculatorForm";

export const metadata: Metadata = {
  title: "Calculator — CONNECTeam",
};

/**
 * The premium calculator (Plan 05b) — a real route rather than a hub
 * `?section=`, same as Leads/Add Member: an interactive tool, not a content
 * page. Pricing itself happens in the requestPremium Server Action (Plan
 * 05a); this page only gates and frames the client form.
 */
export default async function CalculatorPage() {
  await requireMember();

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Calculator
        </h1>
        <p className="mt-1 text-ink-500">
          Hitung premi produk untuk calon klienmu.
        </p>
      </div>
      <CalculatorForm />
    </div>
  );
}
