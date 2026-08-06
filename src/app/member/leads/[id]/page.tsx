import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getLeadForViewer } from "@/lib/leads";
import { waLink } from "@/lib/leadContact";
import { DISC_QUESTIONS, DISC_TRAITS, type DiscTrait } from "@/lib/disc/questions";
import type { DiscResult } from "@/lib/disc/score";
import { DISC_PROFILES, TRAIT_META } from "@/content/disc-profiles";

export const metadata: Metadata = {
  title: "Detail Lead — CONNECTeam",
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * `notFound()` fires identically for a nonexistent id and for one outside
 * the viewer's subtree (getLeadForViewer returns null either way) — the
 * route can't be used to probe which ids exist.
 */
export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireMember();
  const lead = await getLeadForViewer(user.id, id);
  if (!lead) notFound();

  const result = lead.result as DiscResult;
  const { answers } = lead.inputs as { answers: DiscTrait[] };
  const profile = DISC_PROFILES[result.profileKey];
  const isMember = Boolean(lead.takerUserId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="h-1 w-full rounded-full bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink-900">
              {lead.name}
              <span className="ml-2 rounded-full border border-brand-navy-200 bg-brand-navy-50 px-2 py-0.5 align-middle font-mono text-xs font-semibold text-brand-navy-700">
                {result.profileKey}
              </span>
              {isMember && (
                <span className="ml-2 rounded-full bg-brand-yellow-100 px-2 py-0.5 align-middle text-xs font-bold text-brand-yellow-700">
                  Anggota
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Lewat link {lead.owner.name} &middot; {formatDate(lead.createdAt)}
            </p>
          </div>
          {!isMember && (
            <a
              href={waLink(lead.contact)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-brand-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800"
            >
              Chat di WhatsApp
            </a>
          )}
        </div>

        {/* Trait breakdown */}
        <ul className="mt-6 flex flex-col gap-3">
          {DISC_TRAITS.map((trait) => {
            const meta = TRAIT_META[trait];
            return (
              <li key={trait}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink-900">
                    {`${trait} · ${meta.label}`}
                  </span>
                  <span className="text-ink-500">
                    {result.percentages[trait]}%
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full ${meta.barClass}`}
                    style={{ width: `${result.percentages[trait]}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-xl border border-brand-yellow-100 bg-brand-yellow-50 p-4">
          <h2 className="font-semibold text-ink-900">{profile.title}</h2>
          <p className="mt-1 text-sm text-ink-700">{profile.summary}</p>
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-ink-700">
            Lembar jawaban ({answers.length})
          </summary>
          <ol className="mt-3 flex flex-col gap-2">
            {DISC_QUESTIONS.map((question, index) => {
              const trait = answers[index];
              const statement = question.statements.find(
                (s) => s.trait === trait,
              );
              return (
                <li key={question.id} className="text-sm text-ink-500">
                  {question.prompt} —{" "}
                  <span className="font-medium text-ink-700">
                    {statement ? `${statement.text} (${trait})` : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        </details>
      </div>
    </div>
  );
}
