import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/join", label: "Join Us" },
  { href: "/tools/disc", label: "DISC Test" },
  { href: "/tools/calculator", label: "Income Calculator" },
];

const SOCIAL_LINKS = [
  { href: "https://instagram.com", label: "Instagram" },
  { href: "https://www.tiktok.com", label: "TikTok" },
  { href: "https://wa.me", label: "WhatsApp" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-header max-w-content items-center justify-between px-6">
          <Link
            href="/"
            className="bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 bg-clip-text text-xl font-bold text-transparent"
          >
            CONNECTeam
          </Link>

          <nav aria-label="Primary">
            <ul className="flex items-center gap-6 text-sm font-medium text-ink-700">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-brand-red-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            href="/login"
            className="rounded-full bg-brand-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-ink-100 bg-ink-50">
        <div className="mx-auto flex max-w-content flex-col gap-4 px-6 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} CONNECTeam. All rights reserved.</p>

          <ul className="flex items-center gap-4">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-red-600"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
