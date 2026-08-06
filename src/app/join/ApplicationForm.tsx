"use client";

import { useRef, useState } from "react";
import type { EducationLevel } from "@prisma/client";
import {
  DocTile,
  EditField,
  EditInput,
  EditSelect,
  EditTextArea,
} from "@/components/forms/IntakeFormFields";
import type { ApplicantInput } from "@/lib/applicant";
import {
  APPLICANT_INTAKE_BUCKET,
  applicantStoragePath,
  type ApplicantFileField,
} from "@/lib/applicantFiles";
import { saveJoinDraft } from "@/lib/joinDraft";
import { EDUCATION_OPTIONS } from "@/lib/memberIntakeOptions";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { checkExistingMember, submitApplication } from "./actions";

const MAX_FILE_BYTES = 100 * 1024 * 1024; // matches the source form's "Max 100MB"

type FormState = {
  fullName: string;
  ktpNumber: string;
  birthPlace: string;
  birthDate: string;
  activeEmail: string;
  activePhone: string;
  address: string;
  education: EducationLevel | "";
  schoolName: string;
  schoolCity: string;
  graduationYear: string;
  pengundangUnit: string;
};

type FileFields = Record<ApplicantFileField, File | null>;

const EMPTY_FORM: FormState = {
  fullName: "",
  ktpNumber: "",
  birthPlace: "",
  birthDate: "",
  activeEmail: "",
  activePhone: "",
  address: "",
  education: "",
  schoolName: "",
  schoolCity: "",
  graduationYear: "",
  pengundangUnit: "",
};

const EMPTY_FILES: FileFields = {
  ktp: null,
  selfie: null,
  familyCard: null,
  savings: null,
  spouse: null,
};

const REQUIRED_FILES: { field: ApplicantFileField; label: string }[] = [
  { field: "ktp", label: "Foto KTP" },
  { field: "selfie", label: "Foto Selfie (tanpa pegang KTP)" },
  { field: "familyCard", label: "Kartu Keluarga" },
  { field: "savings", label: "Buku Tabungan" },
];

const DOC_ICONS: Record<ApplicantFileField, React.ReactNode> = {
  ktp: <KtpIcon />,
  selfie: <SelfieIcon />,
  familyCard: <FamilyIcon />,
  savings: <SavingsIcon />,
  spouse: <SpouseIcon />,
};

/** Everything the all-at-once validation pass can flag: form fields plus
 * the file slots. One flat map — the two key sets don't collide. */
type ErrorKey = keyof FormState | ApplicantFileField;
type FieldErrors = Partial<Record<ErrorKey, string>>;

/** The five group cards, in page order — drives the per-card error counts
 * and the linked summary above the button. */
const SECTIONS = [
  { key: "kontak", title: "Nama & kontak", fields: ["fullName", "activeEmail", "activePhone"] },
  { key: "identitas", title: "Identitas", fields: ["ktpNumber", "birthPlace", "birthDate", "address"] },
  { key: "pendidikan", title: "Pendidikan terakhir", fields: ["education", "schoolName", "schoolCity", "graduationYear"] },
  { key: "dokumen", title: "Dokumen", fields: ["ktp", "selfie", "familyCard", "savings", "spouse"] },
  { key: "pengundang", title: "Pengundang / Unit", fields: ["pengundangUnit"] },
] as const satisfies readonly { key: string; title: string; fields: readonly ErrorKey[] }[];

type SectionKey = (typeof SECTIONS)[number]["key"];

/**
 * The public "Join Us" application — since Plan 20, the same five group
 * cards as the member Profile page (shared kit in
 * @/components/forms/IntakeFormFields), but as one open form with a single
 * "Kirim aplikasi" at the end: nobody's signed in here, so there's nothing
 * server-side to save sections into. Unlike Profile's first-error-only
 * check, submit validates everything at once — inline message per field, a
 * count chip per card, and a linked summary above the button.
 *
 * The submit flow itself is unchanged from Plan 15/07c: an existing-member
 * email short-circuits to a login handoff (saveJoinDraft) before anything
 * uploads; otherwise five files upload straight to Supabase Storage and
 * submitApplication lands the row in a leader's review queue
 * (src/app/member/admin/add-member).
 */
export default function ApplicationForm({
  pengundangUnitOptions,
}: {
  pengundangUnitOptions: string[];
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<FileFields>(EMPTY_FILES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<
    "idle" | "checking" | "uploading" | "saving" | "error" | "done" | "existing-member"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  // "Mengupload N dari M…" — five files ride one click, so the longest step
  // gets a visible count instead of an unqualified spinner-word.
  const [uploadsDone, setUploadsDone] = useState(0);
  const [uploadsTotal, setUploadsTotal] = useState(0);

  // One plain ref object per card, passed straight through as `cardRef` —
  // a callback-ref factory here reads as a render-time ref access to the
  // React Compiler lint, and a child writing into a shared ref-map prop
  // trips react-hooks/immutability. Five explicit refs keep both happy.
  const kontakRef = useRef<HTMLDivElement | null>(null);
  const identitasRef = useRef<HTMLDivElement | null>(null);
  const pendidikanRef = useRef<HTMLDivElement | null>(null);
  const dokumenRef = useRef<HTMLDivElement | null>(null);
  const pengundangRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement | null>> = {
    kontak: kontakRef,
    identitas: identitasRef,
    pendidikan: pendidikanRef,
    dokumen: dokumenRef,
    pengundang: pengundangRef,
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // A field stops being flagged the moment it's touched — the next submit
    // re-checks everything anyway.
    setFieldErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function pickFile(field: ApplicantFileField, file: File | null) {
    if (file && file.size > MAX_FILE_BYTES) {
      // Rejected at pick time, not held until submit — the picker is still
      // open in the person's head; "which file was too big" is obvious now.
      setFiles((cur) => ({ ...cur, [field]: null }));
      setFieldErrors((e) => ({ ...e, [field]: "Ukuran file maksimal 100MB." }));
      return;
    }
    setFiles((cur) => ({ ...cur, [field]: file }));
    setFieldErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.fullName.trim()) errs.fullName = "Nama lengkap wajib diisi.";
    if (!form.activeEmail.trim()) errs.activeEmail = "Email aktif wajib diisi.";
    if (!form.activePhone.trim()) errs.activePhone = "No HP aktif wajib diisi.";
    if (!form.ktpNumber.trim()) errs.ktpNumber = "Nomor KTP wajib diisi.";
    if (!form.birthPlace.trim()) errs.birthPlace = "Tempat lahir wajib diisi.";
    if (!form.birthDate || Number.isNaN(Date.parse(form.birthDate))) {
      errs.birthDate = "Tanggal lahir wajib diisi.";
    }
    if (!form.address.trim()) errs.address = "Alamat domisili wajib diisi.";
    if (!form.education) errs.education = "Pendidikan Terakhir wajib dipilih.";
    if (!form.schoolName.trim()) errs.schoolName = "Nama sekolah/universitas wajib diisi.";
    if (!form.schoolCity.trim()) errs.schoolCity = "Kota sekolah/universitas wajib diisi.";
    if (!form.graduationYear.trim()) errs.graduationYear = "Tahun kelulusan wajib diisi.";
    for (const f of REQUIRED_FILES) {
      if (!files[f.field]) errs[f.field] = `${f.label} wajib diupload.`;
    }
    for (const [field, file] of Object.entries(files) as [ApplicantFileField, File | null][]) {
      // Oversize is already rejected at pick time; this is the belt to that
      // suspender, in case a pick path ever skips the check.
      if (file && file.size > MAX_FILE_BYTES) errs[field] = "Ukuran file maksimal 100MB.";
    }
    if (!form.pengundangUnit) errs.pengundangUnit = "Pengundang / Unit wajib dipilih.";
    return errs;
  }

  function sectionErrorCount(section: (typeof SECTIONS)[number], errs: FieldErrors): number {
    return section.fields.filter((f) => errs[f]).length;
  }

  function scrollToSection(key: SectionKey) {
    // jsdom has no scrollIntoView; optional-call keeps tests honest.
    sectionRefs[key].current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Everything at once, before the existing-member check — no network
    // round trip for a form that can't submit anyway.
    const errs = validate();
    setFieldErrors(errs);
    const firstBad = SECTIONS.find((s) => sectionErrorCount(s, errs) > 0);
    if (firstBad) {
      scrollToSection(firstBad.key);
      return;
    }

    setStatus("checking");

    try {
      // Before a single byte is uploaded: is this email already a member?
      // Folding the question into submitApplication (which runs after the
      // uploads) would burn 4-5 real Storage uploads only to throw them
      // away. If it is, nothing is uploaded and no Applicant is created —
      // we stash the typed answers and send them to log in instead.
      if (await checkExistingMember(form.activeEmail)) {
        saveJoinDraft(form);
        setStatus("existing-member");
        return;
      }

      const picked = Object.values(files).filter(Boolean).length;
      setUploadsTotal(picked);
      setUploadsDone(0);
      setStatus("uploading");
      const supabase = createSupabaseBrowserClient();
      const submissionId = crypto.randomUUID();

      async function uploadIfNeeded(
        field: ApplicantFileField,
        file: File | null,
      ): Promise<string | null> {
        if (!file) return null;
        const ext = file.name.split(".").pop() || "jpg";
        const path = applicantStoragePath(submissionId, field, ext);
        // upsert: false (not true, unlike TestResultUpload/JoinDataForm) —
        // submissionId is a fresh crypto.randomUUID() every Submit click, so
        // there's never a real path collision to overwrite here. That
        // matters beyond style: upsert makes Storage check for an existing
        // object first, which needs SELECT-level access on the bucket — but
        // anon (applicants have no account yet) only has an INSERT policy
        // here, no SELECT at all, so upsert:true fails outright for them
        // with "new row violates row-level security policy" even though the
        // object never existed.
        const { error: uploadError } = await supabase.storage
          .from(APPLICANT_INTAKE_BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        setUploadsDone((d) => d + 1);
        return path;
      }

      const [ktpPhotoKey, selfiePhotoKey, familyCardPhotoKey, savingsPhotoKey, spousePhotoKey] =
        await Promise.all([
          uploadIfNeeded("ktp", files.ktp),
          uploadIfNeeded("selfie", files.selfie),
          uploadIfNeeded("familyCard", files.familyCard),
          uploadIfNeeded("savings", files.savings),
          uploadIfNeeded("spouse", files.spouse),
        ]);

      setStatus("saving");
      const input: ApplicantInput = {
        ...form,
        education: form.education as EducationLevel,
        ktpPhotoKey: ktpPhotoKey!,
        selfiePhotoKey: selfiePhotoKey!,
        familyCardPhotoKey: familyCardPhotoKey!,
        savingsPhotoKey: savingsPhotoKey!,
        spousePhotoKey,
      };
      await submitApplication(input);

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal mengirim. Coba lagi sebentar lagi.");
    }
  }

  if (status === "existing-member") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink-900">
          Email kamu udah kedaftar sebagai member!
        </p>
        <p className="text-ink-500">
          Nggak perlu daftar lagi lewat form ini. Login pakai akun Google{" "}
          <span className="font-medium text-ink-700">{form.activeEmail}</span>, terus
          data yang barusan kamu isi bakal langsung kekopi ke halaman Profile — tinggal
          upload ulang dokumennya aja.
        </p>
        <a
          href="/login?next=%2Fmember%2Fprofile"
          className="mt-1 rounded-full bg-brand-navy-700 px-6 py-2.5 font-semibold text-white hover:bg-brand-navy-800"
        >
          Login &amp; lanjut isi data
        </a>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink-900">Aplikasi kamu udah kekirim!</p>
        <p className="text-ink-500">
          Tim kami bakal ngecek data kamu. Kalau lolos, kamu bakal dihubungi buat
          langkah selanjutnya.
        </p>
      </div>
    );
  }

  const badSections = SECTIONS.filter((s) => sectionErrorCount(s, fieldErrors) > 0);
  const errorCount = SECTIONS.reduce((n, s) => n + sectionErrorCount(s, fieldErrors), 0);
  const pickedCount = REQUIRED_FILES.filter((f) => files[f.field]).length;
  const busy = status === "checking" || status === "uploading" || status === "saving";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* 1 — Nama & kontak */}
      <FormCard
        step={1}
        cardRef={kontakRef}
        title="Nama & kontak"
        errorCount={sectionErrorCount(SECTIONS[0], fieldErrors)}
      >
        <EditField label="Nama Lengkap (sesuai KTP)" wide>
          <EditInput
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={fieldErrors.fullName ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.fullName} />
        </EditField>
        <EditField label="Email aktif">
          <EditInput
            type="email"
            value={form.activeEmail}
            onChange={(e) => update("activeEmail", e.target.value)}
            className={fieldErrors.activeEmail ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.activeEmail} />
          <span className="mt-0.5 text-xs text-ink-500">
            Kami hubungi kamu lewat email ini.
          </span>
        </EditField>
        <EditField label="No HP aktif (Whatsapp)">
          <EditInput
            type="tel"
            value={form.activePhone}
            onChange={(e) => update("activePhone", e.target.value)}
            className={fieldErrors.activePhone ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.activePhone} />
        </EditField>
      </FormCard>

      {/* 2 — Identitas */}
      <FormCard
        step={2}
        cardRef={identitasRef}
        title="Identitas"
        errorCount={sectionErrorCount(SECTIONS[1], fieldErrors)}
      >
        <EditField label="No KTP">
          <EditInput
            inputMode="numeric"
            value={form.ktpNumber}
            onChange={(e) => update("ktpNumber", e.target.value)}
            className={fieldErrors.ktpNumber ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.ktpNumber} />
        </EditField>
        <EditField label="Tempat lahir">
          <EditInput
            value={form.birthPlace}
            onChange={(e) => update("birthPlace", e.target.value)}
            className={fieldErrors.birthPlace ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.birthPlace} />
        </EditField>
        <EditField label="Tanggal lahir">
          <EditInput
            type="date"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            className={fieldErrors.birthDate ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.birthDate} />
        </EditField>
        <EditField label="Alamat domisili" wide>
          <EditTextArea
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className={fieldErrors.address ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.address} />
        </EditField>
      </FormCard>

      {/* 3 — Pendidikan terakhir */}
      <FormCard
        step={3}
        cardRef={pendidikanRef}
        title="Pendidikan terakhir"
        errorCount={sectionErrorCount(SECTIONS[2], fieldErrors)}
      >
        <EditField label="Jenjang">
          <EditSelect
            label="Jenjang"
            options={EDUCATION_OPTIONS}
            value={form.education}
            onChange={(v) => update("education", v as EducationLevel)}
          />
          <FieldError message={fieldErrors.education} />
        </EditField>
        <EditField label="Tahun kelulusan">
          <EditInput
            inputMode="numeric"
            value={form.graduationYear}
            onChange={(e) => update("graduationYear", e.target.value)}
            className={fieldErrors.graduationYear ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.graduationYear} />
        </EditField>
        <EditField label="Sekolah / universitas">
          <EditInput
            value={form.schoolName}
            onChange={(e) => update("schoolName", e.target.value)}
            className={fieldErrors.schoolName ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.schoolName} />
        </EditField>
        <EditField label="Kota">
          <EditInput
            value={form.schoolCity}
            onChange={(e) => update("schoolCity", e.target.value)}
            className={fieldErrors.schoolCity ? invalidInputClass : undefined}
          />
          <FieldError message={fieldErrors.schoolCity} />
        </EditField>
      </FormCard>

      {/* 4 — Dokumen: tiles, not dropzones. Nothing uploads until Kirim. */}
      <FormCard
        step={4}
        cardRef={dokumenRef}
        title="Dokumen"
        suffix={
          <span className="rounded-full border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
            {pickedCount} dari {REQUIRED_FILES.length} wajib
          </span>
        }
        errorCount={sectionErrorCount(SECTIONS[3], fieldErrors)}
        plain
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {REQUIRED_FILES.map((f) => (
            <DocTile
              key={f.field}
              label={f.label}
              icon={DOC_ICONS[f.field]}
              url={null}
              editable
              pending
              pendingFile={files[f.field]}
              invalid={Boolean(fieldErrors[f.field])}
              onReplace={(file) => pickFile(f.field, file)}
              onRemove={() => pickFile(f.field, null)}
            />
          ))}
          <DocTile
            label="Foto KTP Pasangan"
            icon={DOC_ICONS.spouse}
            url={null}
            optional
            editable
            pending
            pendingFile={files.spouse}
            invalid={Boolean(fieldErrors.spouse)}
            onReplace={(file) => pickFile("spouse", file)}
            onRemove={() => pickFile("spouse", null)}
          />
        </div>
        <DocErrors errors={fieldErrors} />
        <p className="mt-3 text-xs text-ink-500">
          Foto jelas &amp; tidak buram, maks. 100MB per file. Buku tabungan: halaman
          depan / rekening koran bagian atas — terlihat nama bank, no rekening dan nama
          pemilik. KTP pasangan cuma kalau sudah berkeluarga.
        </p>
      </FormCard>

      {/* 5 — Pengundang / Unit + the one button on the page */}
      <FormCard
        step={5}
        cardRef={pengundangRef}
        title="Pengundang / Unit"
        errorCount={sectionErrorCount(SECTIONS[4], fieldErrors)}
        plain
      >
        <EditField label="Siapa yang ngajak kamu?">
          <EditSelect
            label="Pengundang / Unit"
            options={pengundangUnitOptions.map((u) => ({ value: u, label: u }))}
            value={form.pengundangUnit}
            onChange={(v) => update("pengundangUnit", v)}
          />
          <FieldError message={fieldErrors.pengundangUnit} />
          <span className="mt-0.5 text-xs text-ink-500">
            Nggak tahu? Pilih nama unit tempat kamu dengar soal CONNECTeam.
          </span>
        </EditField>

        <div className="mt-5 flex flex-col gap-3.5 border-t border-ink-100 pt-4">
          {errorCount > 0 && (
            <p
              role="alert"
              className="rounded-xl border border-danger-500/30 bg-danger-500/5 px-4 py-3 text-sm text-danger-500"
            >
              <span className="font-semibold">{errorCount} hal masih kurang.</span> Cek{" "}
              {badSections.map((s, i) => (
                <span key={s.key}>
                  {i > 0 && (i === badSections.length - 1 ? " dan " : ", ")}
                  <button
                    type="button"
                    onClick={() => scrollToSection(s.key)}
                    className="font-semibold underline hover:text-danger-500/80"
                  >
                    {s.title}
                  </button>
                </span>
              ))}
              .
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger-500">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-brand-navy-700 px-6 py-2.5 font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
            >
              {status === "uploading"
                ? `Mengupload ${Math.min(uploadsDone + 1, uploadsTotal)} dari ${uploadsTotal}…`
                : status === "saving"
                  ? "Mengirim…"
                  : status === "checking"
                    ? "Mengecek…"
                    : "Kirim aplikasi"}
            </button>
            <span className="text-[13px] text-ink-500">
              {status === "uploading" || status === "saving"
                ? "Jangan tutup halaman ini. File lagi dikirim."
                : "Cek lagi sebelum kirim — setelah terkirim, perubahan lewat leader kamu."}
            </span>
          </div>
        </div>
      </FormCard>
    </form>
  );
}

// !important — this appends after editInputClass, and two same-layer
// border-color utilities otherwise resolve by stylesheet order, not by
// class-list order, so the base border-ink-300 can silently win.
const invalidInputClass = "!border-danger-500/60 !bg-danger-500/5";

/** One of the five group cards — the Profile group-card chrome
 * (FieldGroupCard's look) plus what a live form needs on top: a step
 * number, a "N belum diisi" chip when submit flagged it, and a ref so the
 * failed-submit scroll can find it. Local to this form on purpose; the
 * Profile cards never carry any of that. */
function FormCard({
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 text-xs font-medium text-danger-500">{message}</span>;
}

/** The tiles flag themselves red; the sentences live in one line under the
 * grid (a message per tile would crowd cells that are mostly icon). */
function DocErrors({ errors }: { errors: FieldErrors }) {
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

// Tile icons — same drawings as the Profile page's Dokumen card
// (IntakeFormFields.tsx's DOC_ICONS, which aren't exported; the applicant
// field set is this form's own type, so it keeps its own record).
function TileIcon({ children }: { children: React.ReactNode }) {
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

function KtpIcon() {
  return (
    <TileIcon>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M14 10h4M14 14h4M5 16c.9-1.6 2.1-2.4 3.5-2.4S11.1 14.4 12 16" />
    </TileIcon>
  );
}

function SelfieIcon() {
  return (
    <TileIcon>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.5 20c0-3.6 3.4-5.8 7.5-5.8s7.5 2.2 7.5 5.8" />
    </TileIcon>
  );
}

function FamilyIcon() {
  return (
    <TileIcon>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="16" cy="9" r="2.6" />
      <path d="M3 19c0-2.7 2.2-4.4 5-4.4s5 1.7 5 4.4M13.5 19c0-2.7 1.5-4.4 4-4.4s3.5 1.7 3.5 4.4" />
    </TileIcon>
  );
}

function SavingsIcon() {
  return (
    <TileIcon>
      <path d="M3 8.5 12 4l9 4.5" />
      <path d="M5 10.5v7M9.7 10.5v7M14.3 10.5v7M19 10.5v7" />
      <path d="M3 20.5h18" />
    </TileIcon>
  );
}

function SpouseIcon() {
  return (
    <TileIcon>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M12 9.5v5M9.5 12h5" />
    </TileIcon>
  );
}
