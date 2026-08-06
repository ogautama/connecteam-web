/**
 * The `/member/**` loading boundary. Two jobs, and the second is the one that
 * actually moves the clock:
 *
 * 1. Feedback. Every hub section is a `?section=` change on one dynamic route,
 *    so switching sections is a server round trip. Without a boundary the
 *    router holds the *old* page on screen until the whole RSC payload lands
 *    and the click reads as a freeze.
 * 2. Prefetching. A dynamic page isn't prefetched at all unless a loading
 *    boundary exists — with one, everything above it (shell, sidebar, header)
 *    is prefetched and only the payload below it waits on the server. See
 *    node_modules/next/dist/docs/01-app/02-guides/prefetching.md, "Prefetching
 *    static vs. dynamic routes".
 *
 * Renders inside MemberShell's <main>, so it only stands in for the page body
 * — the sidebar and header stay put across the transition. Shaped to match
 * QuestHub's banner-then-card layout so the swap doesn't jump.
 */
export default function MemberLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat"
      role="status"
      className="mx-auto flex w-full max-w-content animate-pulse flex-col gap-6"
    >
      {/* Quest banner — kept at its real gradient rather than a grey block,
          since it's identical on every section and never actually reloads. */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 p-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-56 rounded bg-white/40" />
          <div className="h-3 w-72 rounded bg-white/25" />
        </div>
        <div className="h-2 rounded-full bg-white/20" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-brand-navy-50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-brand-navy-100" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 rounded bg-brand-navy-100" />
            <div className="h-3 w-64 rounded bg-brand-navy-100/70" />
          </div>
        </div>

        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-white/70" />
        ))}
      </div>
    </div>
  );
}
