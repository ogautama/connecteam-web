import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UNTIL_AGE_TERMS } from "@ogautama/premium-engine/public";
import { requireMember } from "@/lib/auth";
import { getLeadForViewer, type LeadWithOwner } from "@/lib/leads";
import { waLink } from "@/lib/leadContact";
import { DISC_QUESTIONS, DISC_TRAITS, type DiscTrait } from "@/lib/disc/questions";
import type { DiscResult } from "@/lib/disc/score";
import { calculatorLeadResult } from "@/lib/premium/lead";
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

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/**
 * `notFound()` fires identically for a nonexistent id and for one outside
 * the viewer's subtree (getLeadForViewer returns null either way) — the
 * route can't be used to probe which ids exist.
 *
 * The layout is chosen by `lead.source` (Plan 05c). Before that, every lead
 * was cast to a DiscResult regardless of source, so a calculator lead's id —
 * which is perfectly reachable, `getLeadForViewer` not filtering by source —
 * would have crashed on `DISC_PROFILES[undefined]`.
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="h-1 w-full rounded-full bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
        {lead.source === "calculator" ? (
          <CalculatorLeadDetail lead={lead} />
        ) : (
          <DiscLeadDetail lead={lead} />
        )}
      </div>
    </div>
  );
}

function DiscLeadDetail({ lead }: { lead: LeadWithOwner }) {
  const result = lead.result as DiscResult;
  const { answers } = lead.inputs as { answers: DiscTrait[] };
  const profile = DISC_PROFILES[result.profileKey];
  const isMember = Boolean(lead.takerUserId);

  return (
    <>
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
    </>
  );
}

/** 60/99 mean "until age N" for life_PHE, not a duration (UNTIL_AGE_TERMS). */
function termLabel(term: number): string {
  return (UNTIL_AGE_TERMS as ReadonlySet<number>).has(term)
    ? `Sampai usia ${term}`
    : `${term} tahun`;
}

/**
 * Display only — deliberately no "download the PDF again" button (Plan 05c).
 * A premium depends on the client's insurance age at the quote date and on the
 * rate tables in force then, so a regenerated document months later could
 * quietly disagree with what the client was told. Wanting the PDF again means
 * running the calculator again, honestly, at today's rates. This row stays the
 * historical record of what was quoted and when.
 */
function CalculatorLeadDetail({ lead }: { lead: LeadWithOwner }) {
  const result = calculatorLeadResult(lead.result);
  const isMember = Boolean(lead.takerUserId);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900">
            {lead.name}
            <span className="ml-2 rounded-full border border-brand-navy-200 bg-brand-navy-50 px-2 py-0.5 align-middle text-xs font-semibold text-brand-navy-700">
              {result.productDisplayName} · {result.planType}
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Penawaran oleh {lead.owner.name} &middot;{" "}
            {formatDate(lead.createdAt)}
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

      <div className="mt-6 flex flex-wrap gap-10">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
            Kontribusi bulanan
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-ink-900">
            {rupiah.format(result.monthlyPremium)}
          </p>
          {result.discount > 0 && (
            <p className="text-sm text-ink-300 line-through">
              {rupiah.format(result.monthlyPremiumBeforeDiscount)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
            Kontribusi tahunan
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-ink-900">
            {rupiah.format(result.premi)}
          </p>
          {result.discount > 0 && (
            <p className="text-sm text-ink-300 line-through">
              {rupiah.format(result.annualPremiumBeforeDiscount)}
            </p>
          )}
        </div>
      </div>

      {result.discount > 0 && (
        <p className="mt-3 inline-block rounded-full bg-brand-yellow-100 px-3 py-0.5 text-xs font-semibold text-brand-yellow-700">
          Diskon {Math.round(result.discount * 100)}% diterapkan
        </p>
      )}

      <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-ink-100 pt-6 text-sm sm:grid-cols-2">
        <Detail label="Santunan Asuransi">
          {rupiah.format(result.sumAssured)}
        </Detail>
        <Detail label="Masa pembayaran">
          {termLabel(result.paymentTerm)}
        </Detail>
        <Detail label="Usia asuransi saat penawaran">
          {result.insuranceAge} tahun
        </Detail>
        <Detail label="Tanggal lahir">{result.dateOfBirth}</Detail>
        <Detail label="Jenis kelamin">{result.gender}</Detail>
        <Detail label="Status merokok">{result.smokingStatus}</Detail>
        <Detail label="Kontak">{lead.contact}</Detail>
      </dl>

      <p className="mt-6 rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-500">
        Angka di atas adalah hasil perhitungan pada{" "}
        {formatDate(new Date(result.quotedAt))}. Butuh PDF-nya lagi? Hitung
        ulang di kalkulator — kontribusi ikut usia asuransi klien dan tarif yang
        berlaku saat itu, jadi penawaran baru selalu yang paling jujur.
      </p>
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-ink-900">{children}</dd>
    </div>
  );
}
