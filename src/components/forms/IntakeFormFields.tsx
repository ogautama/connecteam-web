"use client";

import { useId, useState } from "react";
import type { EducationLevel } from "@prisma/client";
import { EDUCATION_OPTIONS } from "@/lib/memberIntakeOptions";
import type { MemberIntakeFileField } from "@/lib/memberIntakeFiles";

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
  readOnly,
  note,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  /** Display-only. Opt-in per field because this kit is shared with the
   * public /join form, where every field must stay editable — an applicant
   * has no account to pin a value to yet. Never the only guard: whatever
   * locks a field here has to be re-derived server-side, since the action
   * is reachable by direct POST. */
  readOnly?: boolean;
  /** Short "why" shown under the field — pairs with readOnly, so a locked
   * field explains itself instead of just refusing to type. */
  note?: string;
}) {
  return (
    <QuestionCard>
      <label className="flex flex-col gap-2">
        <FieldLabel label={label} required={required} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-readonly={readOnly}
          placeholder="Jawaban kamu"
          className={`border-b px-0.5 py-2 placeholder:text-ink-300 focus:outline-none ${
            readOnly
              ? "cursor-not-allowed border-ink-100 bg-ink-50 text-ink-500"
              : "border-ink-100 bg-transparent text-ink-900 focus:border-b-2 focus:border-brand-navy-700 focus:pb-[7px]"
          }`}
        />
        {note && <span className="text-sm text-ink-500">{note}</span>}
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
  schoolCity: string;
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
 * Plan 19 — the three groups a saved record can be edited in one at a time.
 * Documents aren't here: they edit per-tile (see DocTile), not as a group.
 */
export type IntakeSection = "kontak" | "identitas" | "pendidikan";

/** The subset of fields a section editor can change, always strings so a
 * single onFieldChange callback covers all of them (education's value is a
 * string union, so it fits without a generic key/value pairing). */
export type IntakeSectionValues = {
  fullName: string;
  activePhone: string;
  ktpNumber: string;
  birthPlace: string;
  birthDate: string;
  address: string;
  education: EducationLevel | "";
  schoolName: string;
  schoolCity: string;
  graduationYear: string;
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function KtpTileIcon() {
  return (
    <Icon>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M14 10h4M14 14h4M5 16c.9-1.6 2.1-2.4 3.5-2.4S11.1 14.4 12 16" />
    </Icon>
  );
}

function SelfieTileIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.5 20c0-3.6 3.4-5.8 7.5-5.8s7.5 2.2 7.5 5.8" />
    </Icon>
  );
}

function FamilyTileIcon() {
  return (
    <Icon>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="16" cy="9" r="2.6" />
      <path d="M3 19c0-2.7 2.2-4.4 5-4.4s5 1.7 5 4.4M13.5 19c0-2.7 1.5-4.4 4-4.4s3.5 1.7 3.5 4.4" />
    </Icon>
  );
}

function SavingsTileIcon() {
  return (
    <Icon>
      <path d="M3 8.5 12 4l9 4.5" />
      <path d="M5 10.5v7M9.7 10.5v7M14.3 10.5v7M19 10.5v7" />
      <path d="M3 20.5h18" />
    </Icon>
  );
}

function SpouseTileIcon() {
  return (
    <Icon>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M12 9.5v5M9.5 12h5" />
    </Icon>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4M6.1 6.6A16.7 16.7 0 0 0 2 12s3.6 7 10 7a10.4 10.4 0 0 0 4.4-1" />
      <path d="M9.9 9.9a2.9 2.9 0 0 0 4.1 4.1" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

/** Groups every digit but the last four behind bullets, in fours, the way
 * card numbers read — reversible client-side since the browser already has
 * the real value; nothing new crosses the network to mask or reveal it. */
function maskDigits(digits: string): string {
  const hiddenCount = Math.max(digits.length - 4, 0);
  const masked = "•".repeat(hiddenCount) + digits.slice(-4);
  return masked.replace(/(.{4})(?=.)/g, "$1 ");
}

function groupDigits(digits: string): string {
  return digits.replace(/(.{4})(?=.)/g, "$1 ");
}

/** No KTP is a government ID — shown as last-four-only until the member
 * deliberately reveals it, in case the screen is shared (Plan 19). */
export function MaskedKtpField({ label, value }: { label: string; value: string }) {
  const [revealed, setRevealed] = useState(false);
  const digits = value.replace(/\s+/g, "");

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[15.5px] font-medium tabular-nums text-ink-900">
          {revealed ? groupDigits(digits) : maskDigits(digits)}
        </span>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-brand-navy-700 hover:bg-brand-navy-50 hover:text-brand-navy-800"
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
          {revealed ? "Sembunyikan" : "Lihat"}
        </button>
      </span>
    </div>
  );
}

export function Field({
  label,
  value,
  wide,
  numeric,
}: {
  label: string;
  value: string;
  wide?: boolean;
  numeric?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs text-ink-500">{label}</span>
      <span className={`break-words text-[15.5px] font-medium text-ink-900 ${numeric ? "tabular-nums" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function SectionEditButton({ section, onEdit }: { section: string; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Ubah ${section}`}
      className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold text-brand-navy-700 hover:bg-brand-navy-50 hover:text-brand-navy-800"
    >
      Ubah
    </button>
  );
}

/** A group card in its resting, read-only state — Identitas and Pendidikan
 * both use this shape (Field label-above-value pairs in a two-column grid);
 * only the identity header and the documents card have their own layout. */
export function FieldGroupCard({
  title,
  onEdit,
  suffix,
  children,
}: {
  title: string;
  onEdit?: () => void;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink-100 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</span>
          {suffix}
        </div>
        {onEdit && <SectionEditButton section={title} onEdit={onEdit} />}
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** The same group-card chrome, swapped into an editable state — used for
 * whichever one section is currently being edited. */
export function EditCard({
  title,
  onSave,
  onCancel,
  saving,
  error,
  children,
}: {
  title: string;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-brand-navy-200 bg-white p-6 shadow-sm ring-4 ring-brand-navy-50">
      <div className="mb-4 border-b border-ink-100 pb-3.5">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger-500">
          {error}
        </p>
      )}
      <div className="mt-5 flex items-center gap-4 border-t border-ink-100 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-brand-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-sm font-medium text-ink-500 hover:text-ink-900 disabled:opacity-60"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

const editInputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-[15.5px] text-ink-900 focus:border-brand-navy-700 focus:outline-none focus:ring-2 focus:ring-brand-navy-100";

export function EditField({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  // A real <label>, not just a styled span — implicitly associates with the
  // one form control inside, same as the first-fill form kit's TextField.
  return (
    <label className={`flex flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs text-ink-500">{label}</span>
      {children}
    </label>
  );
}

// Both merge an incoming className onto the base look instead of dropping
// it, so a caller can layer state styling (the /join form's invalid-field
// red) without forking the input.
export function EditInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${editInputClass} ${className ?? ""}`} />;
}

export function EditTextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={`${editInputClass} resize-none ${className ?? ""}`} />;
}

export function EditSelect({
  value,
  onChange,
  label,
  options = EDUCATION_OPTIONS,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Defaults to the education list this select was built for (the Profile
   * Pendidikan editor); the /join form also feeds it the live
   * Pengundang / Unit names (Plan 20). */
  options?: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={editInputClass}
    >
      <option value="" disabled>
        Pilih…
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * The identity header — monogram avatar, name, email · phone, "Unit ..." and
 * "Data lengkap" chips. Doubles as the edit card for the "kontak" section
 * (name + phone; email always renders locked, since it's re-derived
 * server-side from the session regardless of what's submitted).
 */
export function IdentityHeader({
  data,
  editing,
  values,
  onFieldChange,
  onEdit,
  onSave,
  onCancel,
  saving,
  error,
}: {
  data: IntakeSummaryData;
  editing?: boolean;
  values?: Pick<IntakeSectionValues, "fullName" | "activePhone">;
  onFieldChange?: (key: "fullName" | "activePhone", value: string) => void;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  error?: string | null;
}) {
  const complete = Boolean(
    data.ktpPhotoUrl && data.selfiePhotoUrl && data.familyCardPhotoUrl && data.savingsPhotoUrl,
  );
  const initial = data.fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
      <div className="h-2.5 bg-gradient-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
      {editing ? (
        <div className="p-6">
          <div className="mb-4 border-b border-ink-100 pb-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
              Nama &amp; kontak
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditField label="Nama Lengkap (sesuai KTP)" wide>
              <EditInput
                value={values?.fullName ?? ""}
                onChange={(e) => onFieldChange?.("fullName", e.target.value)}
              />
            </EditField>
            <EditField label="No HP aktif (Whatsapp)">
              <EditInput
                type="tel"
                value={values?.activePhone ?? ""}
                onChange={(e) => onFieldChange?.("activePhone", e.target.value)}
              />
            </EditField>
            <EditField label="Email aktif">
              <input
                type="email"
                value={data.activeEmail}
                readOnly
                aria-readonly
                className={`${editInputClass} cursor-not-allowed border-dashed bg-ink-50 text-ink-500`}
              />
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                <LockIcon />
                Email akun Google kamu — hubungi leader kalau perlu pindah.
              </span>
            </EditField>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger-500">
              {error}
            </p>
          )}
          <div className="mt-5 flex items-center gap-4 border-t border-ink-100 pt-4">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-brand-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="text-sm font-medium text-ink-500 hover:text-ink-900 disabled:opacity-60"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 p-6">
          <div
            aria-hidden
            className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-navy-700 to-brand-navy-800 text-2xl font-bold text-white"
          >
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="text-xl font-bold tracking-tight text-ink-900">{data.fullName}</div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-500">
              <span className="break-all">{data.activeEmail}</span>
              <span className="text-ink-300">·</span>
              <span>{data.activePhone}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-brand-navy-100 bg-brand-navy-50 px-2.5 py-1 text-xs font-semibold text-brand-navy-700">
                Unit {data.pengundangUnitLabel}
              </span>
              {complete && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success-500/30 bg-success-500/10 px-2.5 py-1 text-xs font-semibold text-success-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Data lengkap
                </span>
              )}
            </div>
          </div>
          {onEdit && <SectionEditButton section="Nama & kontak" onEdit={onEdit} />}
        </div>
      )}
    </div>
  );
}

/** One document tile, in one of two lives:
 *
 * - **Saved** (the Profile page): `url` points at an uploaded object.
 *   "Ganti" (or "Upload" when missing) replaces just that file and saves
 *   immediately; there's no group-level edit for Dokumen, so this is always
 *   interactive on its own when `editable`.
 * - **Pending** (`pending` — the /join form, Plan 20): nothing exists
 *   server-side yet, so the tile holds a picked `File` that only uploads on
 *   the form's single submit. Shows the filename in place of "Terupload",
 *   offers "Ganti · Hapus", and a still-empty required tile invites with
 *   "Pilih file" on navy dashes instead of reading like absent data. */
export function DocTile({
  label,
  icon,
  url,
  optional,
  editable,
  replacing,
  onReplace,
  pending,
  pendingFile,
  onRemove,
  invalid,
}: {
  label: string;
  icon: React.ReactNode;
  url: string | null;
  optional?: boolean;
  editable: boolean;
  replacing?: boolean;
  /** File chosen — in saved mode this uploads+saves immediately (the
   * Profile flow); in pending mode it just hands the File to the form. */
  onReplace?: (file: File) => void;
  /** Pre-submit mode: no `url` ever, `pendingFile` instead. */
  pending?: boolean;
  pendingFile?: File | null;
  /** Un-pick the pending file (pending mode only). */
  onRemove?: () => void;
  /** Required tile flagged by a submit-time validation pass. */
  invalid?: boolean;
}) {
  const inputId = useId();
  const missing = !url && !pendingFile;

  // Empty-tile chrome: red dashes when flagged, grey for the optional slot,
  // and in pending mode inviting navy (matches the form's upload dropzones)
  // for a required pick that hasn't happened yet.
  const emptyClass = invalid
    ? "border-dashed border-danger-500/60 bg-danger-500/5"
    : pending && !optional
      ? "border-dashed border-brand-navy-200 bg-brand-navy-50"
      : "border-dashed border-ink-200 bg-ink-50";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        missing ? emptyClass : "border-ink-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg ${
            missing
              ? invalid
                ? "border border-dashed border-danger-500/60 bg-white text-danger-500"
                : pending && !optional
                  ? "border border-dashed border-brand-navy-200 bg-white text-brand-navy-700"
                  : "border border-dashed border-ink-300 bg-white text-ink-300"
              : "bg-brand-navy-50 text-brand-navy-700"
          }`}
        >
          {icon}
        </span>
        <span className={`text-[13.5px] font-semibold leading-tight ${missing ? "text-ink-500" : "text-ink-900"}`}>
          {label}
        </span>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 break-all text-xs font-semibold ${
          missing ? (invalid ? "text-danger-500" : "text-ink-500") : "text-success-500"
        }`}
      >
        {!missing && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
        {pendingFile
          ? pendingFile.name
          : missing
            ? optional
              ? "Opsional"
              : pending
                ? "Belum dipilih"
                : "Belum diupload"
            : "Terupload"}
      </span>
      <div className="mt-auto flex items-center gap-2 pt-0.5 text-[13px] font-semibold text-brand-navy-700">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-red-600">
            Lihat
          </a>
        )}
        {url && editable && <span className="text-ink-300">·</span>}
        {editable && (
          <label htmlFor={inputId} className="cursor-pointer hover:text-brand-red-600">
            {replacing ? "Mengupload…" : missing ? (pending ? "Pilih file" : "Upload") : "Ganti"}
          </label>
        )}
        {editable && pendingFile && onRemove && (
          <>
            <span className="text-ink-300">·</span>
            <button type="button" onClick={onRemove} className="hover:text-brand-red-600">
              Hapus
            </button>
          </>
        )}
      </div>
      {editable && (
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          disabled={replacing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onReplace?.(file);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}

const REQUIRED_DOC_FIELDS: { field: MemberIntakeFileField; label: string }[] = [
  { field: "ktp", label: "Foto KTP" },
  { field: "selfie", label: "Foto Selfie" },
  { field: "familyCard", label: "Kartu Keluarga" },
  { field: "savings", label: "Buku Tabungan" },
];

/** Exported since Plan 20 — the /join and first-fill forms render their own
 * pending-mode tile grids and want the same drawings. ApplicantFileField is
 * the same five literals, so indexing with it type-checks. */
export const DOC_ICONS: Record<MemberIntakeFileField, React.ReactNode> = {
  ktp: <KtpTileIcon />,
  selfie: <SelfieTileIcon />,
  familyCard: <FamilyTileIcon />,
  savings: <SavingsTileIcon />,
  spouse: <SpouseTileIcon />,
};

const DOC_URL_KEY = {
  ktp: "ktpPhotoUrl",
  selfie: "selfiePhotoUrl",
  familyCard: "familyCardPhotoUrl",
  savings: "savingsPhotoUrl",
  spouse: "spousePhotoUrl",
} as const satisfies Record<MemberIntakeFileField, keyof IntakeSummaryData>;

export function DocumentsCard({
  data,
  editable,
  replacingField,
  onReplace,
}: {
  data: IntakeSummaryData;
  editable: boolean;
  replacingField?: MemberIntakeFileField | null;
  onReplace?: (field: MemberIntakeFileField, file: File) => void;
}) {
  const doneCount = REQUIRED_DOC_FIELDS.filter((d) => data[DOC_URL_KEY[d.field]]).length;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5 border-b border-ink-100 pb-3.5">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Dokumen</span>
        <span className="rounded-full border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
          {doneCount} dari {REQUIRED_DOC_FIELDS.length} wajib
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {REQUIRED_DOC_FIELDS.map((d) => (
          <DocTile
            key={d.field}
            label={d.label}
            icon={DOC_ICONS[d.field]}
            url={data[DOC_URL_KEY[d.field]]}
            editable={editable}
            replacing={replacingField === d.field}
            onReplace={(file) => onReplace?.(d.field, file)}
          />
        ))}
        <DocTile
          label="Foto KTP Pasangan"
          icon={DOC_ICONS.spouse}
          url={data.spousePhotoUrl}
          optional
          editable={editable}
          replacing={replacingField === "spouse"}
          onReplace={(file) => onReplace?.("spouse", file)}
        />
      </div>
    </div>
  );
}

/**
 * One group card of a first-fill form (Plan 20 — the /join application and
 * the Profile first-fill, which have no saved record to edit section by
 * section): the FieldGroupCard chrome plus what a live form needs on top —
 * a step number, a "N belum diisi" chip when a submit-time validation pass
 * flagged it, and a ref so the failed-submit scroll can find it.
 */
export function FormCard({
  step,
  title,
  suffix,
  errorCount,
  cardRef,
  plain,
  children,
}: {
  step: number;
  title: string;
  suffix?: React.ReactNode;
  errorCount: number;
  cardRef: React.Ref<HTMLDivElement>;
  /** Skip the two-column field grid — the card lays out its own body
   * (document tiles, the submit footer). */
  plain?: boolean;
  children: React.ReactNode;
}) {
  const invalid = errorCount > 0;
  return (
    <div
      ref={cardRef}
      className={`scroll-mt-24 rounded-2xl border bg-white p-6 shadow-sm ${
        invalid ? "border-danger-500/40 ring-4 ring-danger-500/5" : "border-ink-100"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink-100 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full border border-brand-navy-100 bg-brand-navy-50 text-[11.5px] font-bold tabular-nums text-brand-navy-700"
          >
            {step}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</span>
          {suffix}
        </div>
        {invalid && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger-500/30 bg-danger-500/10 px-2.5 py-1 text-xs font-semibold text-danger-500">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {errorCount} belum diisi
          </span>
        )}
      </div>
      {plain ? children : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

// !important — appended after editInputClass, and two same-layer
// border-color utilities otherwise resolve by stylesheet order, not by
// class-list order, so the base border-ink-300 can silently win.
export const invalidInputClass = "!border-danger-500/60 !bg-danger-500/5";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 text-xs font-medium text-danger-500">{message}</span>;
}

/** The tiles flag themselves red; the sentences live in one line under the
 * grid (a message per tile would crowd cells that are mostly icon). */
export function DocErrors({
  errors,
}: {
  errors: Partial<Record<MemberIntakeFileField, string>>;
}) {
  const messages = [
    ...new Set(
      (["ktp", "selfie", "familyCard", "savings", "spouse"] as const)
        .map((f) => errors[f])
        .filter((m): m is string => Boolean(m)),
    ),
  ];
  if (messages.length === 0) return null;
  return (
    <p className="mt-3 text-xs font-medium text-danger-500">{messages.join(" ")}</p>
  );
}

/**
 * The read-only recap shown once intake data exists — reused for two
 * sources: a member's own saved MemberIntake (editable, per-section — Plan
 * 19) and a signed-in member's accepted /join Applicant, shown fully
 * read-only (editable=false; editing that is future work, per the user's
 * explicit 2026-07-30 call).
 *
 * At most one section edits at a time (`editingSection`); Dokumen is never
 * one of them — its tiles edit individually regardless of `editingSection`.
 */
export function IntakeSummary({
  data,
  note,
  editable = false,
  editingSection = null,
  sectionValues,
  onFieldChange,
  onEditSection,
  onSaveSection,
  onCancelSection,
  savingSection = false,
  sectionError = null,
  replacingDocument = null,
  onReplaceDocument,
}: {
  data: IntakeSummaryData;
  note?: string;
  editable?: boolean;
  editingSection?: IntakeSection | null;
  sectionValues?: IntakeSectionValues;
  onFieldChange?: (key: keyof IntakeSectionValues, value: string) => void;
  onEditSection?: (section: IntakeSection) => void;
  onSaveSection?: () => void;
  onCancelSection?: () => void;
  savingSection?: boolean;
  sectionError?: string | null;
  replacingDocument?: MemberIntakeFileField | null;
  onReplaceDocument?: (field: MemberIntakeFileField, file: File) => void;
}) {
  const v = sectionValues;

  return (
    <div className="flex flex-col gap-4">
      <IdentityHeader
        data={data}
        editing={editingSection === "kontak"}
        values={v}
        onFieldChange={(key, value) => onFieldChange?.(key, value)}
        onEdit={editable ? () => onEditSection?.("kontak") : undefined}
        onSave={onSaveSection}
        onCancel={onCancelSection}
        saving={savingSection}
        error={editingSection === "kontak" ? sectionError : null}
      />

      {editingSection === "identitas" && v ? (
        <EditCard
          title="Identitas"
          onSave={() => onSaveSection?.()}
          onCancel={() => onCancelSection?.()}
          saving={savingSection}
          error={sectionError}
        >
          <EditField label="No KTP">
            <EditInput
              inputMode="numeric"
              value={v.ktpNumber}
              onChange={(e) => onFieldChange?.("ktpNumber", e.target.value)}
            />
          </EditField>
          <EditField label="Tempat lahir">
            <EditInput
              value={v.birthPlace}
              onChange={(e) => onFieldChange?.("birthPlace", e.target.value)}
            />
          </EditField>
          <EditField label="Tanggal lahir">
            <EditInput
              type="date"
              value={v.birthDate}
              onChange={(e) => onFieldChange?.("birthDate", e.target.value)}
            />
          </EditField>
          <EditField label="Alamat domisili" wide>
            <EditTextArea
              value={v.address}
              onChange={(e) => onFieldChange?.("address", e.target.value)}
            />
          </EditField>
        </EditCard>
      ) : (
        <FieldGroupCard
          title="Identitas"
          onEdit={editable ? () => onEditSection?.("identitas") : undefined}
        >
          <MaskedKtpField label="No KTP" value={data.ktpNumber} />
          <Field
            label="Tempat & tanggal lahir"
            value={`${data.birthPlace}, ${formatIntakeDate(data.birthDate)}`}
          />
          <Field label="Alamat domisili" value={data.address} wide />
        </FieldGroupCard>
      )}

      {editingSection === "pendidikan" && v ? (
        <EditCard
          title="Pendidikan terakhir"
          onSave={() => onSaveSection?.()}
          onCancel={() => onCancelSection?.()}
          saving={savingSection}
          error={sectionError}
        >
          <EditField label="Jenjang">
            <EditSelect
              label="Jenjang"
              value={v.education}
              onChange={(value) => onFieldChange?.("education", value)}
            />
          </EditField>
          <EditField label="Tahun kelulusan">
            <EditInput
              value={v.graduationYear}
              onChange={(e) => onFieldChange?.("graduationYear", e.target.value)}
            />
          </EditField>
          <EditField label="Sekolah / universitas">
            <EditInput
              value={v.schoolName}
              onChange={(e) => onFieldChange?.("schoolName", e.target.value)}
            />
          </EditField>
          <EditField label="Kota">
            <EditInput
              value={v.schoolCity}
              onChange={(e) => onFieldChange?.("schoolCity", e.target.value)}
            />
          </EditField>
        </EditCard>
      ) : (
        <FieldGroupCard
          title="Pendidikan terakhir"
          onEdit={editable ? () => onEditSection?.("pendidikan") : undefined}
        >
          <Field label="Jenjang" value={intakeEducationLabel(data.education)} />
          <Field label="Tahun kelulusan" value={data.graduationYear} numeric />
          <Field label="Sekolah / universitas" value={data.schoolName} />
          <Field label="Kota" value={data.schoolCity} />
        </FieldGroupCard>
      )}

      <DocumentsCard
        data={data}
        editable={editable}
        replacingField={replacingDocument}
        onReplace={onReplaceDocument}
      />

      {note && <p className="px-1 text-sm text-ink-500">{note}</p>}
    </div>
  );
}
