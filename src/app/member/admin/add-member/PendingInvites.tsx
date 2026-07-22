import { daysWaiting, type PendingInviteSummary } from "@/lib/invites";

const ROLE_LABEL = { agent: "Agent", leader: "Leader" } as const;

export function waitingLabel(days: number): string {
  if (days === 0) return "Diundang hari ini";
  if (days === 1) return "Nunggu 1 hari";
  return `Nunggu ${days} hari`;
}

/**
 * `PendingInvite.invitedBy` records who filed the invite, separately from the
 * recruiter the invitee will land under — so a row shows both, and says
 * plainly which ones are the viewing leader's own.
 */
export function inviterLabel(invite: PendingInviteSummary): string {
  if (invite.invitedByYou) return "Diundang kamu";
  return invite.invitedByName
    ? `Diundang ${invite.invitedByName}`
    : "Diundang —";
}

/**
 * The invite side of the leader's branch: everyone who's been pre-authorized
 * but hasn't signed in yet. Rows leave this list on their own — the
 * on_auth_user_created trigger deletes the invite as it creates the User, so
 * "gone from here" is the same event as "they're in".
 */
export default function PendingInvites({
  invites,
}: {
  invites: PendingInviteSummary[];
}) {
  return (
    <section aria-labelledby="pending-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="pending-heading" className="text-lg font-semibold text-ink-900">
          Belum Login
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Undangan di tim kamu dan semua cabang di bawahnya yang belum dipakai.
          Begitu orangnya sign in pakai Google, dia otomatis ilang dari sini.
        </p>
      </div>

      {invites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-100 bg-white p-6 text-ink-500">
          Nggak ada undangan yang lagi nunggu. Semua yang kamu undang udah
          masuk.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col gap-2 rounded-xl border border-ink-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink-900">{invite.email}</p>
                <p className="text-sm text-ink-500">
                  {ROLE_LABEL[invite.role]} · Recruiter:{" "}
                  {invite.recruiterName ?? "—"} · {inviterLabel(invite)}
                </p>
              </div>
              <span className="shrink-0 self-start rounded-full bg-brand-yellow-100 px-3 py-1 text-xs font-semibold text-brand-yellow-700 sm:self-auto">
                {waitingLabel(daysWaiting(invite.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
