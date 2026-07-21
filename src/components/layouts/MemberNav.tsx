"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  isActiveNavItem,
  showsLeaderBadge,
  visibleNavItems,
} from "@/lib/member/nav";

// Client Component purely for the active-link highlight (usePathname) — the
// role filtering itself is pure and lives in @/lib/member/nav.
export default function MemberNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Member">
      <ul className="flex flex-col gap-1 px-3 text-sm font-medium text-ink-700">
        {visibleNavItems(role).map((item) => {
          const active = isActiveNavItem(item, pathname);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                  active
                    ? "bg-brand-navy-50 font-semibold text-brand-navy-700"
                    : "hover:bg-brand-navy-50 hover:text-brand-navy-700"
                }`}
              >
                {item.label}
                {showsLeaderBadge(item, role) && (
                  <span className="rounded-full bg-brand-yellow-100 px-2 py-0.5 text-xs font-semibold text-brand-yellow-700">
                    Leaders
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
