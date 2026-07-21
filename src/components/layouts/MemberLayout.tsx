import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import AccountMenu from "@/components/layouts/AccountMenu";
import MemberNav from "@/components/layouts/MemberNav";

// The shell itself stays a Server Component — only the two bits that need
// browser state (active link, sign-out) are Client Components.
export default function MemberLayout({
  user,
  children,
}: {
  user: CurrentUser;
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

        <MemberNav role={user.role} />
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <header className="flex h-header items-center justify-end border-b border-ink-100 bg-white px-6">
          <AccountMenu name={user.name} role={user.role} />
        </header>

        <main className="flex flex-1 flex-col bg-ink-50 p-6">{children}</main>
      </div>
    </div>
  );
}
