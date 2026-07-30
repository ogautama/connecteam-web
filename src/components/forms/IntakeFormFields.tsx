"use client";

import { useId } from "react";
import type { EducationLevel } from "@prisma/client";
import { EDUCATION_OPTIONS } from "@/lib/memberIntakeOptions";

/**
 * Shared "one box per question" field kit — Google-Forms-style, approved
 * 2026-07-29 for the member "Isi Data" form and reused as-is for the public
 * /join application form so both read as the same product, not two
 * one-off builds.
 */

// Required fields show "Label *" on one line — the asterisk has to be part
// of the same inline child as the label text, since a `flex flex-col`
// ancestor would otherwise stack a bare text node and a sibling span as two
// separate rows instead of sitting them inline.
export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="font-medium text-ink-900">
      {label}
      {required && <span className="text-brand-red-500"> *</span>}
    </span>
  );
}

export function QuestionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}

export function TextField({
  label,
  required,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <QuestionCard>
      <label className="flex flex-col gap-2">
        <FieldLabel label={label} required={required} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Jawaban kamu"
          className="border-b border-ink-100 bg-transparent px-0.5 py-2 text-ink-900 placeholder:text-ink-300 focus:border-b-2 focus:border-brand-navy-700 focus:pb-[7px] focus:outline-none"
        />
      </label>
    </QuestionCard>
  );
}

export function TextAreaField({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionCard>
      <label className="flex flex-col gap-2">
        <FieldLabel label={label} required={required} />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="Jawaban kamu"
          className="resize-none border-b border-ink-100 bg-transparent px-0.5 py-2 text-ink-900 placeholder:text-ink-300 focus:border-b-2 focus:border-brand-navy-700 focus:pb-[7px] focus:outline-none"
        />
      </label>
    </QuestionCard>
  );
}

export function RadioGroup({
  label,
  required,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionCard>
      <fieldset role="radiogroup" aria-label={label} className="flex flex-col gap-2">
        <legend>
          <FieldLabel label={label} required={required} />
        </legend>
        <div className="flex flex-col">
          {options.map((option) => {
            const checked = value === option.value;
            return (
              <label
                key={option.value}
                className={`flex items-center gap-3 rounded-lg px-1 py-2 ${
                  checked ? "font-semibold text-ink-900" : "text-ink-700"
                }`}
              >
                <input
                  type="radio"
                  name={label}
                  checked={checked}
                  onChange={() => onChange(option.value)}
                  className="h-[18px] w-[18px] accent-brand-navy-700"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    </QuestionCard>
  );
}

export function UploadIcon() {
  return (
    <svg
      aria-hidden
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="shrink-0 text-brand-navy-700"
    >
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function FileField({
  label,
  required,
  file,
  existingUrl,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  existingUrl: string | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();

  return (
    <QuestionCard>
      <FieldLabel label={label} required={required} />
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-dashed border-brand-navy-200 bg-brand-navy-50 px-4 py-3 hover:bg-brand-navy-100"
      >
        <UploadIcon />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-brand-navy-700">Pilih file</span>
          <span className="text-xs text-ink-500">
            {file
              ? `File dipilih: ${file.name}`
              : existingUrl
                ? "Sudah ada file tersimpan"
                : "Belum ada file dipilih"}
          </span>
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {existingUrl && !file && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-xs font-medium text-brand-navy-700 underline"
        >
          Lihat file yang udah diupload
        </a>
      )}
    </QuestionCard>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}

export function SummaryFileRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-navy-700 underline hover:text-brand-red-600"
        >
          Lihat file
        </a>
      ) : (
        <span className="text-ink-400">—</span>
      )}
    </div>
  );
}

export function formatIntakeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function intakeEducationLabel(value: EducationLevel): string {
  return EDUCATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export type IntakeSummaryData = {
  fullName: string;
  ktpNumber: string;
  birthPlace: string;
  birthDate: string; // raw "YYYY-MM-DD" — formatted internally
  activeEmail: string;
  activePhone: string;
  address: string;
  education: EducationLevel;
  schoolName: string;
  graduationYear: string;
  /** Either MemberIntake.pengundangUnit directly or an Applicant's joined
   * recruiter name — same display slot either way. */
  pengundangUnitLabel: string;
  ktpPhotoUrl: string | null;
  selfiePhotoUrl: string | null;
  familyCardPhotoUrl: string | null;
  savingsPhotoUrl: string | null;
  spousePhotoUrl: string | null;
};

/**
 * The read-only recap shown once intake data exists — reused as-is for two
 * sources: a member's own saved MemberIntake (editable via onEdit) and a
 * signed-in member's accepted /join Applicant, shown with no onEdit at all
 * (editing that is future work, per the user's explicit 2026-07-30 call).
 */
export function IntakeSummary({
  data,
  note,
  onEdit,
}: {
  data: IntakeSummaryData;
  note?: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
      <SummaryRow label="Nama Lengkap (sesuai KTP)" value={data.fullName} />
      <SummaryRow label="No KTP" value={data.ktpNumber} />
      <SummaryRow label="Tempat Lahir" value={data.birthPlace} />
      <SummaryRow label="Tanggal Lahir" value={formatIntakeDate(data.birthDate)} />
      <SummaryRow label="Email Aktif" value={data.activeEmail} />
      <SummaryRow label="No HP Aktif (Whatsapp)" value={data.activePhone} />
      <SummaryRow label="Alamat Domisili" value={data.address} />
      <SummaryRow label="Pendidikan Terakhir" value={intakeEducationLabel(data.education)} />
      <SummaryRow label="Nama Sekolah / Universitas" value={data.schoolName} />
      <SummaryRow label="Tahun Kelulusan" value={data.graduationYear} />
      <SummaryFileRow label="Foto KTP" url={data.ktpPhotoUrl} />
      <SummaryFileRow label="Foto Selfie" url={data.selfiePhotoUrl} />
      <SummaryFileRow label="Kartu Keluarga" url={data.familyCardPhotoUrl} />
      <SummaryFileRow label="Foto Buku Tabungan" url={data.savingsPhotoUrl} />
      <SummaryFileRow label="Foto KTP Pasangan" url={data.spousePhotoUrl} />
      <SummaryRow label="Pengundang / Unit" value={data.pengundangUnitLabel} />
      {note && <p className="text-sm text-ink-500">{note}</p>}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-1 self-start font-medium text-brand-navy-700 underline hover:text-brand-red-600"
        >
          Ubah data
        </button>
      )}
    </div>
  );
}
