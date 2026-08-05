"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  DEFAULT_SECTION,
  isActiveNavItem,
  isValidSection,
  navItemHref,
  sectionWithinItem,
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
      className={`flex flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 ${
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

/** Which top-level items (by label) default to expanded — whichever one's
 * subtree contains the active section. Recomputed whenever the section
 * changes; there's no persisted/localStorage state. */
function defaultExpanded(items: MemberNavItem[], section: HubSectionId): Set<string> {
  return new Set(
    items
      .filter((item) => item.children?.length && sectionWithinItem(item, section))
      .map((item) => item.label),
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
  const items = visibleNavItems(role);

  const [expanded, setExpanded] = useState(() => defaultExpanded(items, section));
  // Every navigation to a new section resets the sidebar to "only the active
  // section's parent open" — collapse state isn't persisted across loads.
  // Adjusted during render (React's recommended alternative to an effect
  // for "state that resets when a prop changes") rather than in a
  // useEffect, which would cause an extra render on every section switch.
  const [prevSection, setPrevSection] = useState(section);
  if (section !== prevSection) {
    setPrevSection(section);
    setExpanded(defaultExpanded(items, section));
  }

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <nav aria-label="Member">
      <ul className="flex flex-col gap-1 px-3 text-sm font-medium text-ink-700">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const open = expanded.has(item.label);

          return (
            <li key={item.label}>
              <div className="flex items-center gap-1">
                <NavLink
                  item={item}
                  role={role}
                  pathname={pathname}
                  section={section}
                  onNavigate={onNavigate}
                />
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => toggle(item.label)}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-brand-navy-50 hover:text-brand-navy-700"
                  >
                    <span
                      aria-hidden
                      className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}
                    >
                      ›
                    </span>
                  </button>
                )}
              </div>
              {hasChildren && open && (
                <ul className="mt-1 ml-3 flex flex-col gap-1 border-l border-ink-100 pl-3">
                  {item.children!.map((child) => (
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
          );
        })}
      </ul>
    </nav>
  );
}
