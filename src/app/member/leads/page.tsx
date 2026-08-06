import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getLeadsForViewer } from "@/lib/leads";
import type { DiscResult } from "@/lib/disc/score";
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

/**
 * DISC leads scoped to the viewer's own downline (Plan 16) — open to every
 * role, an agent sees only what their own referral link brought in.
 * Scoping happens inside getLeadsForViewer (in the query, from the
 * session), nothing here widens it.
 */
export default async function LeadsPage() {
  const user = await requireMember();
  const leads = await getLeadsForViewer(user.id, "disc");

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Leads
        </h1>
        <p className="mt-1 text-ink-500">
          Hasil tes DISC dari link referral kamu, dan link anggota tim di
          bawahmu.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50 p-10 text-center">
          <p className="font-semibold text-ink-700">Belum ada leads</p>
          <p className="mt-1 text-sm text-ink-500">
            Bagikan link tes DISC kamu — hasil tes calon rekrutmu bakal
            muncul di sini.
          </p>
          <Link
            href="/member"
            className="mt-4 inline-block rounded-full bg-brand-navy-700 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800"
          >
            Ke link tes kamu
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
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
                const isMember = Boolean(lead.takerUserId);
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-ink-100 last:border-0"
                  >
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
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-brand-navy-200 bg-brand-navy-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-navy-700">
                        {result.profileKey}
                      </span>
                    </td>
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
                    <td className="px-4 py-3 text-ink-500">
                      {lead.owner.name}
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
