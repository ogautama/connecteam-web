import type { Metadata } from "next";
import Link from "next/link";
import type { LeadSource } from "@prisma/client";
import { requireMember } from "@/lib/auth";
import { getLeadsForViewer, type LeadWithOwner } from "@/lib/leads";
import type { DiscResult } from "@/lib/disc/score";
import { calculatorLeadResult } from "@/lib/premium/lead";
import { waLink } from "@/lib/leadContact";

export const metadata: Metadata = {
  title: "Leads — CONNECTeam",
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/**
 * The two sources with a lead-producing tool behind them today. DISC stays
 * first and stays the default, so an existing bookmark of `/member/leads`
 * lands exactly where it always did (Plan 05c).
 */
const TABS = [
  { source: "disc" as const, label: "DISC" },
  { source: "calculator" as const, label: "Kalkulator" },
];

function tabFor(value: string | undefined): LeadSource {
  return value === "calculator" ? "calculator" : "disc";
}

/**
 * Leads scoped to the viewer's own downline (Plan 16) — open to every role, an
 * agent sees only what their own link or their own quotes brought in. Scoping
 * happens inside getLeadsForViewer (in the query, from the session); the
 * `?source=` param below picks *which tool's* leads to show and can't widen
 * that.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source: requested } = await searchParams;
  const source = tabFor(requested);

  const user = await requireMember();
  const leads = await getLeadsForViewer(user.id, source);

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Leads
        </h1>
        <p className="mt-1 text-ink-500">
          Hasil tes DISC dan penawaran kalkulator dari kamu, dan dari anggota
          tim di bawahmu.
        </p>
      </div>

      <div role="tablist" aria-label="Sumber lead" className="flex gap-2">
        {TABS.map((tab) => {
          const selected = tab.source === source;
          return (
            <Link
              key={tab.source}
              role="tab"
              aria-selected={selected}
              href={`/member/leads?source=${tab.source}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                selected
                  ? "bg-brand-navy-700 text-white"
                  : "border border-ink-100 text-ink-500 hover:text-ink-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <EmptyState source={source} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          {source === "calculator" ? (
            <CalculatorTable leads={leads} />
          ) : (
            <DiscTable leads={leads} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ source }: { source: LeadSource }) {
  const copy =
    source === "calculator"
      ? {
          body: "Hitung kontribusi untuk calon klien, lalu simpan penawarannya — penawaran itu muncul di sini.",
          href: "/member/calculator",
          cta: "Ke kalkulator",
        }
      : {
          body: "Bagikan link tes DISC kamu — hasil tes calon rekrutmu bakal muncul di sini.",
          href: "/member",
          cta: "Ke link tes kamu",
        };

  return (
    <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50 p-10 text-center">
      <p className="font-semibold text-ink-700">Belum ada leads</p>
      <p className="mt-1 text-sm text-ink-500">{copy.body}</p>
      <Link
        href={copy.href}
        className="mt-4 inline-block rounded-full bg-brand-navy-700 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800"
      >
        {copy.cta}
      </Link>
    </div>
  );
}

const headerClass =
  "border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-500";

function NameCell({ lead }: { lead: LeadWithOwner }) {
  const isMember = Boolean(lead.takerUserId);
  return (
    <td className="px-4 py-3">
      <Link
        href={`/member/leads/${lead.id}`}
        className="font-medium text-ink-900 hover:text-brand-navy-700"
      >
        {lead.name}
      </Link>
      {isMember && (
        <span className="ml-2 rounded-full bg-brand-yellow-100 px-2 py-0.5 text-xs font-bold text-brand-yellow-700">
          Anggota
        </span>
      )}
    </td>
  );
}

function ContactCell({ lead }: { lead: LeadWithOwner }) {
  // A member's own contact is their account email — not a number to chat.
  const isMember = Boolean(lead.takerUserId);
  return (
    <td className="px-4 py-3 text-ink-500">
      {isMember ? (
        lead.contact
      ) : (
        <a
          href={waLink(lead.contact)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-navy-700 hover:underline"
        >
          {lead.contact}
        </a>
      )}
    </td>
  );
}

function DiscTable({ leads }: { leads: LeadWithOwner[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className={headerClass}>
          <th className="px-4 py-3">Nama</th>
          <th className="px-4 py-3">Profil</th>
          <th className="px-4 py-3">Kontak</th>
          <th className="px-4 py-3">Perekrut / Pengundang</th>
          <th className="px-4 py-3">Tanggal</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => {
          const result = lead.result as DiscResult;
          return (
            <tr key={lead.id} className="border-b border-ink-100 last:border-0">
              <NameCell lead={lead} />
              <td className="px-4 py-3">
                <span className="rounded-full border border-brand-navy-200 bg-brand-navy-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-navy-700">
                  {result.profileKey}
                </span>
              </td>
              <ContactCell lead={lead} />
              <td className="px-4 py-3 text-ink-500">{lead.owner.name}</td>
              <td className="px-4 py-3 text-ink-500">
                {formatDate(lead.createdAt)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * No "Profil" column and no DISC_PROFILES lookup — a calculator lead's
 * `result` is a CalculatorLeadResult, which has no profileKey at all.
 */
function CalculatorTable({ leads }: { leads: LeadWithOwner[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className={headerClass}>
          <th className="px-4 py-3">Nama</th>
          <th className="px-4 py-3">Produk</th>
          <th className="px-4 py-3">Santunan Asuransi</th>
          <th className="px-4 py-3">Kontribusi / bulan</th>
          <th className="px-4 py-3">Kontak</th>
          <th className="px-4 py-3">Agen</th>
          <th className="px-4 py-3">Tanggal</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => {
          const result = calculatorLeadResult(lead.result);
          return (
            <tr key={lead.id} className="border-b border-ink-100 last:border-0">
              <NameCell lead={lead} />
              <td className="px-4 py-3 text-ink-500">
                <span className="font-medium text-ink-900">
                  {result.productDisplayName}
                </span>
                <span className="ml-1">· {result.planType}</span>
              </td>
              <td className="px-4 py-3 text-ink-500">
                {rupiah.format(result.sumAssured)}
              </td>
              <td className="px-4 py-3 font-medium text-ink-900">
                {rupiah.format(result.monthlyPremium)}
              </td>
              <ContactCell lead={lead} />
              <td className="px-4 py-3 text-ink-500">{lead.owner.name}</td>
              <td className="px-4 py-3 text-ink-500">
                {formatDate(lead.createdAt)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
