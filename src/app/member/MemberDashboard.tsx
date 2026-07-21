import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { memberSections } from "@/lib/member/nav";

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// Presentational half of /member — the page itself only resolves the session
// and hands the user down, which keeps this renderable in a unit test.
export default function MemberDashboard({ user }: { user: CurrentUser }) {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Halo, {firstNameOf(user.name)}
          </h1>
          <p className="mt-1 text-ink-500">
            Semua yang kamu butuhin buat mulai, jualan, dan bangun tim ada di
            sini.
          </p>
        </div>
        <Link
          href="/member/onboarding"
          className="shrink-0 rounded-full bg-brand-navy-700 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-brand-navy-800"
        >
          Mulai Sekarang
        </Link>
      </section>

      {/* Static until Plan 12 wires up real Contests & Campaigns content. */}
      <section
        aria-labelledby="announcement-heading"
        className="rounded-2xl border border-brand-yellow-200 bg-brand-yellow-50 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-yellow-700">
          Pengumuman
        </p>
        <h2
          id="announcement-heading"
          className="mt-1 text-lg font-semibold text-ink-900"
        >
          Member space baru udah live
        </h2>
        <p className="mt-1 text-ink-500">
          Isi dari situs lama lagi dipindahin ke sini satu per satu. Info
          Contests &amp; Campaigns bakal nongol di sini begitu siap.
        </p>
      </section>

      <section aria-labelledby="sections-heading" className="flex flex-col gap-3">
        <h2 id="sections-heading" className="text-lg font-semibold text-ink-900">
          Menu
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {memberSections(user.role).map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex h-full flex-col gap-1 rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-navy-200 hover:bg-brand-navy-50"
              >
                <span className="font-semibold text-ink-900">
                  {section.label}
                </span>
                <span className="text-sm text-ink-500">
                  {section.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Real event data lands in Plan 13 — empty state until then. */}
      <section aria-labelledby="events-heading" className="flex flex-col gap-3">
        <h2 id="events-heading" className="text-lg font-semibold text-ink-900">
          Acara Terdekat
        </h2>
        <p className="rounded-xl border border-dashed border-ink-100 bg-white p-6 text-ink-500">
          Belum ada acara yang dijadwalin. Kalendernya masih dipindahin — cek{" "}
          <Link
            href="/member/events"
            className="font-medium text-brand-navy-700 hover:text-brand-red-600"
          >
            Events
          </Link>{" "}
          buat info terbaru.
        </p>
      </section>
    </div>
  );
}
