import Link from "next/link";

const SIDEBAR_LINKS = [
  { href: "/member", label: "Dashboard" },
  { href: "/member/onboarding", label: "Get Started" },
  { href: "/member/grow", label: "Grow" },
  { href: "/member/sell", label: "Sell" },
  { href: "/member/reference", label: "Reference Data" },
  { href: "/member/systems", label: "Official Systems" },
  { href: "/member/contests", label: "Contests & Campaigns" },
  { href: "/member/events", label: "Events" },
  { href: "/member/directory", label: "Directory" },
];

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-sidebar shrink-0 border-r border-ink-100 bg-white md:block">
        <div className="flex h-header items-center px-6">
          <Link
            href="/"
            className="bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 bg-clip-text text-lg font-bold text-transparent"
          >
            CONNECTeam
          </Link>
        </div>

        <nav aria-label="Member">
          <ul className="flex flex-col gap-1 px-3 text-sm font-medium text-ink-700">
            {SIDEBAR_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2 hover:bg-brand-navy-50 hover:text-brand-navy-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <header className="flex h-header items-center justify-end border-b border-ink-100 bg-white px-6">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-ink-100 py-1 pl-1 pr-3 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-red-100 text-xs font-semibold text-brand-red-700">
              ?
            </span>
            Account
          </button>
        </header>

        <main className="flex flex-1 flex-col bg-ink-50 p-6">{children}</main>
      </div>
    </div>
  );
}
