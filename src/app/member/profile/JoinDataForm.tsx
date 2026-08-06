"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EducationLevel } from "@prisma/client";
import {
  DOC_ICONS,
  DocErrors,
  DocTile,
  EditField,
  EditInput,
  EditSelect,
  EditTextArea,
  FieldError,
  FormCard,
  IntakeSummary,
  LockIcon,
  invalidInputClass,
  type IntakeSection,
  type IntakeSectionValues,
} from "@/components/forms/IntakeFormFields";
import type { ApplicantAsIntake } from "@/lib/applicant";
import { clearJoinDraft, readJoinDraft, type JoinDraft } from "@/lib/joinDraft";
import type { MemberIntakeInput, MemberIntakeRecord } from "@/lib/memberIntake";
import {
  MEMBER_INTAKE_BUCKET,
  memberIntakeStoragePath,
  type MemberIntakeFileField,
} from "@/lib/memberIntakeFiles";
import { EDUCATION_OPTIONS } from "@/lib/memberIntakeOptions";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { submitJoinData } from "./actions";

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

type FileFields = Record<MemberIntakeFileField, File | null>;

const EMPTY_FILES: FileFields = {
  ktp: null,
  selfie: null,
  familyCard: null,
  savings: null,
  spouse: null,
};

const REQUIRED_FILES: { field: MemberIntakeFileField; label: string }[] = [
  { field: "ktp", label: "Foto KTP" },
  { field: "selfie", label: "Foto Selfie (tanpa pegang KTP)" },
  { field: "familyCard", label: "Kartu Keluarga" },
  { field: "savings", label: "Buku Tabungan" },
];

/** Everything the first-fill's all-at-once validation can flag: form
 * fields plus the file slots. One flat map — the key sets don't collide.
 * Email is locked to the session, so it never appears here. */
type ErrorKey = keyof FormState | MemberIntakeFileField;
type FieldErrors = Partial<Record<ErrorKey, string>>;

/** The five first-fill group cards, in page order (Plan 20b — same layout
 * as /join's ApplicationForm; kontak counts 2 fields, not 3, because the
 * locked email can't be invalid). */
const FIRST_FILL_SECTIONS = [
  { key: "kontak", title: "Nama & kontak", fields: ["fullName", "activePhone"] },
  { key: "identitas", title: "Identitas", fields: ["ktpNumber", "birthPlace", "birthDate", "address"] },
  { key: "pendidikan", title: "Pendidikan terakhir", fields: ["education", "schoolName", "schoolCity", "graduationYear"] },
  { key: "dokumen", title: "Dokumen", fields: ["ktp", "selfie", "familyCard", "savings", "spouse"] },
  { key: "pengundang", title: "Pengundang / Unit", fields: ["pengundangUnit"] },
] as const satisfies readonly { key: string; title: string; fields: readonly ErrorKey[] }[];

type SectionKey = (typeof FIRST_FILL_SECTIONS)[number]["key"];

function emptyForm(defaultEmail: string): FormState {
  return {
    fullName: "",
    ktpNumber: "",
    birthPlace: "",
    birthDate: "",
    activeEmail: defaultEmail,
    activePhone: "",
    address: "",
    education: "",
    schoolName: "",
    schoolCity: "",
    graduationYear: "",
    pengundangUnit: "",
  };
}

/** Same normalization the server uses (lib/invites.ts's normalizeEmail),
 * inlined because that module is server-only — it pulls in Prisma. */
function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function formFromSaved(saved: MemberIntakeRecord): FormState {
  return {
    fullName: saved.fullName,
    ktpNumber: saved.ktpNumber,
    birthPlace: saved.birthPlace,
    birthDate: saved.birthDate,
    activeEmail: saved.activeEmail,
    activePhone: saved.activePhone,
    address: saved.address,
    education: saved.education,
    schoolName: saved.schoolName,
    schoolCity: saved.schoolCity,
    graduationYear: saved.graduationYear,
    pengundangUnit: saved.pengundangUnit,
  };
}

type JoinDataFormProps = {
  userId: string;
  defaultEmail: string;
  initial: MemberIntakeRecord | null;
  /** Live leader names (src/lib/memberIntake.ts's getPengundangUnitOptions),
   * not a fixed list — the source form hardcodes 6 names because it can't
   * query our data; we can. */
  pengundangUnitOptions: string[];
  /** An accepted /join application matching this member's own email
   * (src/lib/applicant.ts's getAcceptedApplicantByEmail) — only looked at
   * when there's no MemberIntake yet. Shown read-only: editing that data
   * is future work, not built this round. */
  linkedApplication: ApplicantAsIntake | null;
};

/**
 * "Isi Data" — the personal-data intake form (Plan 07), fields copied from
 * the real Google Form this replaces (that form is gated behind sign-in, so
 * these were transcribed from a screenshot the user provided, not
 * fabricated). "Pengundang / Unit" is the one field that isn't a fixed
 * copy — it's the live leader list, passed down from the page rather than a
 * hardcoded picklist. Photo fields upload straight to Supabase Storage from
 * the browser, same pattern as TestResultUpload.tsx — the server action
 * only ever sees the resulting storage path.
 *
 * This outer half only sorts out the Plan 07c draft handoff, which can't be
 * read until the browser is running; IntakeForm below is the actual form.
 */
export default function JoinDataForm(props: JoinDataFormProps) {
  const draft = useJoinDraft(props);

  // Consuming it is a one-shot write to an external store, so it belongs in
  // an effect — useJoinDraft caches the value it already read, so clearing
  // the key doesn't pull the prefill back out from under the form.
  useEffect(() => {
    if (draft) clearJoinDraft();
  }, [draft]);

  // Handing the draft down as a seed and remounting on it keeps every
  // field's starting value in one place — IntakeForm's own useState
  // initializers — instead of a second, later pass that overwrites them.
  return <IntakeForm {...props} draft={draft} key={draft ? "from-draft" : "blank"} />;
}

/**
 * The /join draft, or null: someone who filled out the public form under an
 * email that's already a member is sent here to log in with what they typed
 * stashed in sessionStorage (src/lib/joinDraft.ts).
 *
 * Read through useSyncExternalStore rather than during render, because
 * sessionStorage doesn't exist on the server — the server snapshot is
 * always null, so the markup matches on hydration and the draft lands on
 * the pass right after. The draft carries the person's own KTP number and
 * address, so it's only ever applied when the email on it is theirs.
 */
function useJoinDraft({ initial, defaultEmail }: JoinDataFormProps): JoinDraft | null {
  // Cached in a ref because useSyncExternalStore re-reads on every render
  // and demands a stable value — and because the effect above deletes the
  // key as soon as it's been read.
  const cached = useRef<{ value: JoinDraft | null } | null>(null);

  return useSyncExternalStore(
    () => () => {},
    () => {
      if (!cached.current) {
        // A saved MemberIntake always wins, so don't even look.
        const draft = initial ? null : readJoinDraft();
        cached.current = {
          value: draft && sameEmail(draft.activeEmail, defaultEmail) ? draft : null,
        };
      }
      return cached.current.value;
    },
    () => null,
  );
}

function IntakeForm({
  userId,
  defaultEmail,
  initial,
  pengundangUnitOptions,
  linkedApplication,
  draft,
}: JoinDataFormProps & { draft: JoinDraft | null }) {
  const [saved, setSaved] = useState<MemberIntakeRecord | null>(initial);
  const [form, setForm] = useState<FormState>(
    initial
      ? formFromSaved(initial)
      : draft
        ? // The signed-in identity wins over whatever they typed into the
          // public form's Email Aktif — they're the same address modulo
          // case, and this is the one they actually sign in with.
          { ...draft, activeEmail: defaultEmail }
        : emptyForm(defaultEmail),
  );
  const [files, setFiles] = useState<FileFields>(EMPTY_FILES);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Plan 20b — first-fill only: the all-at-once validation pass and the
  // "Mengupload N dari M…" counter, same shape as /join's ApplicationForm.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [uploadsDone, setUploadsDone] = useState(0);
  const [uploadsTotal, setUploadsTotal] = useState(0);

  // One plain ref object per first-fill card (see ApplicationForm for why
  // these aren't a callback-ref factory or a shared ref-map prop).
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

  // Plan 19 — per-section editing once a record exists. `form` doubles as
  // the section editor's field values (it already holds every field), reset
  // to the saved record whenever a section is opened or closed so an edit
  // in one section never leaks into another.
  const [editingSection, setEditingSection] = useState<IntakeSection | null>(null);
  const [sectionStatus, setSectionStatus] = useState<"idle" | "saving">("idle");
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [replacingDocument, setReplacingDocument] = useState<MemberIntakeFileField | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // A field stops being flagged the moment it's touched — the next submit
    // re-checks everything anyway.
    setFieldErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function pickFile(field: MemberIntakeFileField, file: File | null) {
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

  function updateSectionField(key: keyof IntakeSectionValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }) as FormState);
  }

  function startEditingSection(section: IntakeSection) {
    if (!saved) return;
    setForm(formFromSaved(saved));
    setSectionError(null);
    setEditingSection(section);
  }

  function cancelSection() {
    if (saved) setForm(formFromSaved(saved));
    setSectionError(null);
    setEditingSection(null);
  }

  function sectionValidationError(section: IntakeSection): string | null {
    if (section === "kontak") {
      if (!form.fullName.trim()) return "Nama lengkap wajib diisi.";
      if (!form.activePhone.trim()) return "No HP aktif wajib diisi.";
    } else if (section === "identitas") {
      if (!form.ktpNumber.trim()) return "Nomor KTP wajib diisi.";
      if (!form.birthPlace.trim()) return "Tempat lahir wajib diisi.";
      if (!form.birthDate || Number.isNaN(Date.parse(form.birthDate))) {
        return "Tanggal lahir wajib diisi.";
      }
      if (!form.address.trim()) return "Alamat domisili wajib diisi.";
    } else {
      if (!form.education) return "Pendidikan Terakhir wajib dipilih.";
      if (!form.schoolName.trim()) return "Nama sekolah/universitas wajib diisi.";
      if (!form.schoolCity.trim()) return "Kota sekolah/universitas wajib diisi.";
      if (!form.graduationYear.trim()) return "Tahun kelulusan wajib diisi.";
    }
    return null;
  }

  async function saveSection() {
    if (!saved || !editingSection) return;
    const validationError = sectionValidationError(editingSection);
    if (validationError) {
      setSectionError(validationError);
      return;
    }
    setSectionError(null);
    setSectionStatus("saving");

    // Merges the edited group into the saved record — every other field
    // goes back unchanged, so the rest of submitJoinData's validation still
    // passes (those values were already valid when they were saved).
    const input: MemberIntakeInput = {
      ...saved,
      fullName: editingSection === "kontak" ? form.fullName.trim() : saved.fullName,
      activePhone: editingSection === "kontak" ? form.activePhone.trim() : saved.activePhone,
      ktpNumber: editingSection === "identitas" ? form.ktpNumber.trim() : saved.ktpNumber,
      birthPlace: editingSection === "identitas" ? form.birthPlace.trim() : saved.birthPlace,
      birthDate: editingSection === "identitas" ? form.birthDate : saved.birthDate,
      address: editingSection === "identitas" ? form.address.trim() : saved.address,
      education:
        editingSection === "pendidikan" ? (form.education as EducationLevel) : saved.education,
      schoolName: editingSection === "pendidikan" ? form.schoolName.trim() : saved.schoolName,
      schoolCity: editingSection === "pendidikan" ? form.schoolCity.trim() : saved.schoolCity,
      graduationYear:
        editingSection === "pendidikan" ? form.graduationYear.trim() : saved.graduationYear,
    };

    try {
      const next = await submitJoinData(input);
      setSaved(next);
      setForm(formFromSaved(next));
      setEditingSection(null);
      setSectionStatus("idle");
    } catch (err) {
      setSectionStatus("idle");
      setSectionError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  async function handleDocumentReplace(field: MemberIntakeFileField, file: File) {
    if (!saved) return;
    if (file.size > MAX_FILE_BYTES) {
      setDocError("Ukuran file maksimal 100MB.");
      return;
    }
    setDocError(null);
    setReplacingDocument(field);

    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = memberIntakeStoragePath(userId, field, ext);
      const { error: uploadError } = await supabase.storage
        .from(MEMBER_INTAKE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const keyName = `${field}PhotoKey` as
        | "ktpPhotoKey"
        | "selfiePhotoKey"
        | "familyCardPhotoKey"
        | "savingsPhotoKey"
        | "spousePhotoKey";
      const input: MemberIntakeInput = { ...saved, [keyName]: path };
      const next = await submitJoinData(input);
      setSaved(next);
      setForm(formFromSaved(next));
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Gagal mengupload. Coba lagi sebentar lagi.");
    } finally {
      setReplacingDocument(null);
    }
  }

  /** First-fill validation, everything at once (Plan 20b) — the messages
   * match sectionValidationError's so the two flows never disagree on
   * wording. This form only ever renders before a MemberIntake row exists
   * (see the `if (saved) return ...` branch below) — once one does, edits
   * go through the per-section flow instead, so there's never a saved file
   * key to fall back to here. */
  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.fullName.trim()) errs.fullName = "Nama lengkap wajib diisi.";
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
    for (const [field, file] of Object.entries(files) as [MemberIntakeFileField, File | null][]) {
      // Oversize is already rejected at pick time; belt to that suspender.
      if (file && file.size > MAX_FILE_BYTES) errs[field] = "Ukuran file maksimal 100MB.";
    }
    if (!form.pengundangUnit) errs.pengundangUnit = "Pengundang / Unit wajib dipilih.";
    return errs;
  }

  function sectionErrorCount(
    section: (typeof FIRST_FILL_SECTIONS)[number],
    errs: FieldErrors,
  ): number {
    return section.fields.filter((f) => errs[f]).length;
  }

  function scrollToSection(key: SectionKey) {
    // jsdom has no scrollIntoView; optional-call keeps tests honest.
    sectionRefs[key].current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const errs = validate();
    setFieldErrors(errs);
    const firstBad = FIRST_FILL_SECTIONS.find((s) => sectionErrorCount(s, errs) > 0);
    if (firstBad) {
      scrollToSection(firstBad.key);
      return;
    }

    setUploadsTotal(Object.values(files).filter(Boolean).length);
    setUploadsDone(0);
    setStatus("uploading");

    try {
      const supabase = createSupabaseBrowserClient();

      async function uploadIfNeeded(
        field: MemberIntakeFileField,
        file: File | null,
        existingKey: string | null,
      ): Promise<string | null> {
        if (!file) return existingKey;
        const ext = file.name.split(".").pop() || "jpg";
        const path = memberIntakeStoragePath(userId, field, ext);
        const { error: uploadError } = await supabase.storage
          .from(MEMBER_INTAKE_BUCKET)
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;
        setUploadsDone((d) => d + 1);
        return path;
      }

      const [ktpPhotoKey, selfiePhotoKey, familyCardPhotoKey, savingsPhotoKey, spousePhotoKey] =
        await Promise.all([
          uploadIfNeeded("ktp", files.ktp, null),
          uploadIfNeeded("selfie", files.selfie, null),
          uploadIfNeeded("familyCard", files.familyCard, null),
          uploadIfNeeded("savings", files.savings, null),
          uploadIfNeeded("spouse", files.spouse, null),
        ]);

      setStatus("saving");
      const input: MemberIntakeInput = {
        ...form,
        education: form.education as EducationLevel,
        ktpPhotoKey: ktpPhotoKey!,
        selfiePhotoKey: selfiePhotoKey!,
        familyCardPhotoKey: familyCardPhotoKey!,
        savingsPhotoKey: savingsPhotoKey!,
        spousePhotoKey,
      };
      const next = await submitJoinData(input);

      setSaved(next);
      setForm(formFromSaved(next));
      setFiles(EMPTY_FILES);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-4">
        <IntakeSummary
          data={{ ...saved, pengundangUnitLabel: saved.pengundangUnit }}
          editable
          editingSection={editingSection}
          sectionValues={form}
          onFieldChange={updateSectionField}
          onEditSection={startEditingSection}
          onSaveSection={saveSection}
          onCancelSection={cancelSection}
          savingSection={sectionStatus === "saving"}
          sectionError={sectionError}
          replacingDocument={replacingDocument}
          onReplaceDocument={handleDocumentReplace}
        />
        {docError && (
          <p role="alert" className="px-1 text-sm text-danger-500">
            {docError}
          </p>
        )}
      </div>
    );
  }

  // A fresh /join draft outranks the read-only accepted-application view:
  // they just typed this data minutes ago, and the files still have to be
  // re-picked, so the editable form is the only thing that can finish the
  // job.
  if (!saved && linkedApplication && !draft) {
    return (
      <IntakeSummary
        data={{ ...linkedApplication, pengundangUnitLabel: linkedApplication.pengundangUnit }}
        note="Data ini diambil dari aplikasi Join Us kamu yang udah diterima. Belum bisa diubah dari sini — hubungi leader kamu kalau ada yang salah."
      />
    );
  }

  // Plan 20b — the first fill wears the same five group cards as /join's
  // ApplicationForm, with one "Simpan" at the end. Differences from /join:
  // email renders locked to the Google account (no field of the validation
  // pass), there's no existing-member check (they *are* the member), and
  // uploads go to the member-intake bucket keyed by userId with
  // upsert:true (re-submitting after a failure overwrites their own files).
  const badSections = FIRST_FILL_SECTIONS.filter((s) => sectionErrorCount(s, fieldErrors) > 0);
  const errorCount = FIRST_FILL_SECTIONS.reduce(
    (n, s) => n + sectionErrorCount(s, fieldErrors),
    0,
  );
  const pickedCount = REQUIRED_FILES.filter((f) => files[f.field]).length;
  const busy = status === "uploading" || status === "saving";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {draft && (
        <p className="rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-500 shadow-sm">
          Jawaban yang tadi kamu isi di form Join Us udah kekopi ke sini. Cek lagi ya,
          terus upload ulang dokumennya — file nggak bisa ikut kebawa.
        </p>
      )}

      {/* 1 — Nama & kontak */}
      <FormCard
        step={1}
        title="Nama & kontak"
        errorCount={sectionErrorCount(FIRST_FILL_SECTIONS[0], fieldErrors)}
        cardRef={kontakRef}
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
            readOnly
            aria-readonly
            className="cursor-not-allowed border-dashed !bg-ink-50 text-ink-500"
          />
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            <LockIcon />
            Email akun Google kamu — hubungi leader kalau perlu pindah.
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
        title="Identitas"
        errorCount={sectionErrorCount(FIRST_FILL_SECTIONS[1], fieldErrors)}
        cardRef={identitasRef}
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
        title="Pendidikan terakhir"
        errorCount={sectionErrorCount(FIRST_FILL_SECTIONS[2], fieldErrors)}
        cardRef={pendidikanRef}
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

      {/* 4 — Dokumen: tiles hold the picked files; nothing uploads until
          Simpan. */}
      <FormCard
        step={4}
        title="Dokumen"
        suffix={
          <span className="rounded-full border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
            {pickedCount} dari {REQUIRED_FILES.length} wajib
          </span>
        }
        errorCount={sectionErrorCount(FIRST_FILL_SECTIONS[3], fieldErrors)}
        cardRef={dokumenRef}
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
        title="Pengundang / Unit"
        errorCount={sectionErrorCount(FIRST_FILL_SECTIONS[4], fieldErrors)}
        cardRef={pengundangRef}
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
                  ? "Menyimpan…"
                  : "Simpan"}
            </button>
            {busy && (
              <span className="text-[13px] text-ink-500">
                Jangan tutup halaman ini. File lagi dikirim.
              </span>
            )}
          </div>
        </div>
      </FormCard>
    </form>
  );
}
