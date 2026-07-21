import Link from "next/link";

/**
 * Every `/member/<section>` page until Plans 07–14 fill them in. They exist
 * so the nav links and dashboard cards from Plan 06 don't 404 — each plan
 * replaces its own page outright.
 */
export default function SectionPlaceholder({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          {title}
        </h1>
        <p className="mt-1 text-ink-500">{summary}</p>
      </div>

      <p className="rounded-xl border border-dashed border-ink-100 bg-white p-6 text-ink-500">
        Bagian ini masih dipindahin dari member space yang lama. Bakal muncul di
        sini begitu siap — sementara itu, balik dulu ke{" "}
        <Link
          href="/member"
          className="font-medium text-brand-navy-700 hover:text-brand-red-600"
        >
          dashboard
        </Link>
        .
      </p>
    </div>
  );
}
