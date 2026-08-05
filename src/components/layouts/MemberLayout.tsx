import type { CurrentUser } from "@/lib/auth";
import AccountMenu from "@/components/layouts/AccountMenu";
import MemberShell from "@/components/layouts/MemberShell";

// The shell itself stays a Server Component — only the bits that need browser
// state (sidebar toggle, active link, sign-out) are Client Components.
export default function MemberLayout({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <MemberShell
      role={user.role}
      header={<AccountMenu name={user.name} role={user.role} />}
    >
      {children}
    </MemberShell>
  );
}
