"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  DEFAULT_SECTION,
  isActiveNavItem,
  isValidSection,
  navItemHref,
  showsLeaderBadge,
  visibleNavItems,
  type HubSectionId,
  type MemberNavItem,
} from "@/lib/member/nav";

function NavLink({
  item,
  role,
  pathname,
  section,
  nested,
  onNavigate,
}: {
  item: MemberNavItem;
  role: Role;
  pathname: string;
  section: HubSectionId;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActiveNavItem(item, pathname, section);

  return (
    <Link
      href={navItemHref(item)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
        nested ? "text-[0.8125rem]" : ""
      } ${
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
  );
}

// Client Component for the active-link highlight (usePathname/useSearchParams)
// — the role filtering itself is pure and lives in @/lib/member/nav.
export default function MemberNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("section") ?? undefined;
  const section: HubSectionId = isValidSection(raw) ? raw : DEFAULT_SECTION;

  return (
    <nav aria-label="Member">
      <ul className="flex flex-col gap-1 px-3 text-sm font-medium text-ink-700">
        {visibleNavItems(role).map((item) => (
          <li key={item.label}>
            <NavLink
              item={item}
              role={role}
              pathname={pathname}
              section={section}
              onNavigate={onNavigate}
            />
            {item.children && item.children.length > 0 && (
              <ul className="mt-1 ml-3 flex flex-col gap-1 border-l border-ink-100 pl-3">
                {item.children.map((child) => (
                  <li key={child.label}>
                    <NavLink
                      item={child}
                      role={role}
                      pathname={pathname}
                      section={section}
                      nested
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
