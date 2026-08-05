"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { signOut } from "@/lib/auth-browser";

const ROLE_LABEL: Record<Role, string> = {
  agent: "Agent",
  leader: "Leader",
};

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function AccountMenu({
  name,
  role,
}: {
  name: string;
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    // Clears the Supabase auth cookies in the browser; refresh() then drops
    // the cached RSC payload so /member can't render from it on the way out.
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-ink-100 py-1 pl-1 pr-3 text-sm font-medium text-ink-700 hover:bg-ink-50"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-red-100 text-xs font-semibold text-brand-red-700">
          {initialOf(name)}
        </span>
        {name}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-ink-100 bg-white p-1 shadow-lg"
        >
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-500">
            {ROLE_LABEL[role]}
          </p>
          {/* The Profile page's entry point since 2026-08-05, when it left
              the Onboarding checklist — it's personal data a member revisits,
              not a one-time step (see ONBOARDING_SECTIONS in
              @/content/onboarding). The page was called "Isi Data" until the
              rename that followed; its route still is, deliberately, so
              existing links and `?next=` redirects keep working. */}
          <Link
            href="/member/isi-data"
            role="menuitem"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Profile
          </Link>
          <Link
            href="/member"
            role="menuitem"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Member Space
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
