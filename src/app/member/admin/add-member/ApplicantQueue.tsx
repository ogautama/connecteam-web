"use client";

import { useTransition } from "react";
import type { ApplicantSummary } from "@/lib/applicant";
import { EDUCATION_OPTIONS } from "@/lib/memberIntakeOptions";
import { setApplicantStatus } from "./actions";

function educationLabel(value: ApplicantSummary["education"]): string {
  return EDUCATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function PhotoLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-brand-navy-50 px-3 py-1 font-medium text-brand-navy-700 underline hover:bg-brand-navy-100"
    >
      {label}
    </a>
  );
}

function ApplicantCard({ applicant }: { applicant: ApplicantSummary }) {
  const [isPending, startTransition] = useTransition();

  function decide(status: "accepted" | "rejected") {
    startTransition(() => setApplicantStatus(applicant.id, status));
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4">
      <div>
        <p className="font-medium text-ink-900">{applicant.fullName}</p>
        <p className="text-sm text-ink-500">
          {applicant.activeEmail} · {applicant.activePhone}
        </p>
        <p className="text-sm text-ink-500">
          {applicant.birthPlace}, {applicant.birthDate} · {educationLabel(applicant.education)}
          {" — "}
          {applicant.schoolName}, {applicant.schoolCity} ({applicant.graduationYear})
        </p>
        <p className="text-sm text-ink-500">{applicant.address}</p>
        <p className="mt-1 text-sm text-ink-500">
          Pengundang / Unit: {applicant.recruiterName ?? "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <PhotoLink label="Foto KTP" url={applicant.ktpPhotoUrl} />
        <PhotoLink label="Foto Selfie" url={applicant.selfiePhotoUrl} />
        <PhotoLink label="Kartu Keluarga" url={applicant.familyCardPhotoUrl} />
        <PhotoLink label="Buku Tabungan" url={applicant.savingsPhotoUrl} />
        <PhotoLink label="KTP Pasangan" url={applicant.spousePhotoUrl} />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("accepted")}
          className="rounded-full bg-brand-navy-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
        >
          Terima
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("rejected")}
          className="rounded-full border border-ink-100 px-4 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          Tolak
        </button>
      </div>
    </li>
  );
}

/**
 * The review queue for /join's public application form — branch-scoped
 * (src/lib/applicant.ts's listApplicantsFor), same tree-permission rule as
 * PendingInvites below. "Terima" doesn't create an account by itself — the
 * leader still adds the member manually with the form above, same as any
 * other new member (the user's explicit call: keep that step manual rather
 * than auto-inviting straight from an unreviewed public submission).
 */
export default function ApplicantQueue({
  applicants,
}: {
  applicants: ApplicantSummary[];
}) {
  return (
    <section aria-labelledby="applicants-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="applicants-heading" className="text-lg font-semibold text-ink-900">
          Pendaftar dari Join Us
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Aplikasi publik yang masuk lewat halaman &quot;Join Us&quot;, dari tim kamu
          dan semua cabang di bawahnya. Terima dulu di sini, baru tambahin
          anggotanya manual lewat form di atas.
        </p>
      </div>

      {applicants.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-100 bg-white p-6 text-ink-500">
          Belum ada pendaftar yang nunggu direview.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {applicants.map((applicant) => (
            <ApplicantCard key={applicant.id} applicant={applicant} />
          ))}
        </ul>
      )}
    </section>
  );
}
