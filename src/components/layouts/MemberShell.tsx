"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import MemberNav from "@/components/layouts/MemberNav";

/**
 * One toggle, two resting states — the sidebar's sensible default differs by
 * breakpoint: visible on desktop, closed on a phone (where it opens as an
 * overlay drawer). Since only one breakpoint is ever active, a single flag
 * covers both if each side's classes are inverted:
 *
 *   untoggled → `hidden md:block`  (phone: closed,  desktop: shown)
 *   toggled   → `block md:hidden`  (phone: drawer,  desktop: hidden)
 *
 * That also closes the long-standing gap of the member area having no mobile
 * nav at all.
 */
export default function MemberShell({
  role,
  header,
  children,
}: {
  role: Role;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [toggled, setToggled] = useState(false);

  return (
    <div className="flex min-h-full">
      {toggled && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setToggled(false)}
          className="fixed inset-0 z-20 bg-ink-900/40 md:hidden"
        />
      )}

      <aside
        id="member-sidebar"
        className={`${
          toggled ? "block md:hidden" : "hidden md:block"
        } fixed inset-y-0 left-0 z-30 w-sidebar shrink-0 overflow-y-auto border-r border-ink-100 bg-white md:static md:z-auto`}
      >
        <div className="flex h-header items-center px-6">
          <Link href="/" className="text-lg font-bold">
            <span className="text-brand-navy-700">CONNECT</span>
            {/* Matches the "eam" red in public/logo/connecteam-wordmark.png — outside the brand-red scale, which trends pinker than the logo's coral. */}
            <span className="text-[#f2404e]">eam</span>
          </Link>
        </div>

        {/* useSearchParams needs a Suspense boundary above it. */}
        <Suspense fallback={null}>
          <MemberNav role={role} onNavigate={() => setToggled(false)} />
        </Suspense>
      </aside>

      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <header className="flex h-header items-center justify-between gap-4 border-b border-ink-100 bg-white px-6">
          <button
            type="button"
            onClick={() => setToggled((t) => !t)}
            aria-controls="member-sidebar"
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-brand-navy-50 hover:text-brand-navy-700"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {header}
        </header>

        <main className="flex flex-1 flex-col bg-ink-50 p-6">{children}</main>
      </div>
    </div>
  );
}
