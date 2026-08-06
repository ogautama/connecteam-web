"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * The origin can only be known client-side (this renders the same across
 * localhost/staging/prod without an env var to keep in sync) — read through
 * useSyncExternalStore rather than an effect, same pattern as
 * JoinDataForm's useJoinDraft: the server snapshot is always "", so the
 * markup matches on hydration and the real origin lands on the pass right
 * after, no setState-during-effect render cascade.
 */
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

/** Where a DISC lead starts (Plan 16): the member's permanent inviteCode,
 * turned into a full /tools/disc?ref= link. */
export default function ReferralCard({ inviteCode }: { inviteCode: string }) {
  const path = `/tools/disc?ref=${inviteCode}`;
  const link = `${useOrigin()}${path}`;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable — the link is still
      // selectable text, so there's nothing to recover from here.
    }
  }

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6">
      <div className="h-1 w-12 rounded-full bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
      <h2 className="mt-3 text-lg font-semibold text-ink-900">
        Link tes DISC kamu
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Bagikan ke calon rekrutmu. Semua yang isi tes lewat link ini muncul di
        halaman Leads kamu — lengkap sama hasil dan nomor WhatsApp-nya.
      </p>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50 p-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate text-sm text-ink-700">
          {link}
        </code>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 rounded-full bg-brand-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800"
        >
          {copied ? "Tersalin!" : "Salin link"}
        </button>
      </div>
    </section>
  );
}
