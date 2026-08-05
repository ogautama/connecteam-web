import Link from "next/link";
import HeaderLoginButton from "@/components/layouts/HeaderLoginButton";
import AccountMenu from "@/components/layouts/AccountMenu";
import type { CurrentUser } from "@/lib/auth";
import { CALCULATOR_LIVE, DISC_LIVE } from "@/lib/features";

// Tool links are hidden until their pages exist (Plans 04/05) — see
// src/lib/features.ts. `live: false` entries are filtered out.
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/join", label: "Join Us" },
  { href: "/tools/disc", label: "DISC Test", live: DISC_LIVE },
  { href: "/tools/calculator", label: "Income Calculator", live: CALCULATOR_LIVE },
].filter((link) => link.live !== false);

const SOCIAL_LINKS = [
  { href: "https://instagram.com", label: "Instagram" },
  { href: "https://www.tiktok.com", label: "TikTok" },
  { href: "https://wa.me", label: "WhatsApp" },
];

export default function MarketingLayout({
  children,
  user = null,
}: {
  children: React.ReactNode;
  // Public marketing pages don't gate on session, but a signed-in member
  // browsing one (e.g. via the /member/onboarding "Tes DISC" link) should
  // still see themselves recognized instead of a generic "Login" button.
  user?: CurrentUser | null;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-header max-w-content items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold">
            <span className="text-brand-navy-700">CONNECT</span>
            {/* Matches the "eam" red in public/logo/connecteam-wordmark.png — outside the brand-red scale, which trends pinker than the logo's coral. */}
            <span className="text-[#f2404e]">eam</span>
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

          {user ? (
            <AccountMenu name={user.name} role={user.role} />
          ) : (
            <HeaderLoginButton />
          )}
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
