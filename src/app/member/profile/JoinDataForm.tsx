"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EducationLevel } from "@prisma/client";
import {
  FileField,
  IntakeSummary,
  RadioGroup,
  TextAreaField,
  TextField,
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

  // This form only ever renders before a MemberIntake row exists (see the
  // `if (saved) return ...` branch above) — once one does, edits go through
  // the per-section flow instead, so there's never a saved key to fall back
  // to here.
  const requiredFiles: { field: MemberIntakeFileField; label: string; existingKey: string | null }[] = [
    { field: "ktp", label: "Foto KTP", existingKey: null },
    { field: "selfie", label: "Foto Selfie (tanpa pegang KTP)", existingKey: null },
    { field: "familyCard", label: "Kartu Keluarga", existingKey: null },
    { field: "savings", label: "Foto buku tabungan / rekening koran", existingKey: null },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.education) {
      setError("Pendidikan Terakhir wajib dipilih.");
      return;
    }
    if (!form.pengundangUnit) {
      setError("Pengundang / Unit wajib dipilih.");
      return;
    }
    for (const f of requiredFiles) {
      if (!files[f.field] && !f.existingKey) {
        setError(`${f.label} wajib diupload.`);
        return;
      }
    }
    for (const file of Object.values(files)) {
      if (file && file.size > MAX_FILE_BYTES) {
        setError("Ukuran file maksimal 100MB.");
        return;
      }
    }

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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {draft && (
        <p className="rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-500 shadow-sm">
          Jawaban yang tadi kamu isi di form Join Us udah kekopi ke sini. Cek lagi ya,
          terus upload ulang dokumennya — file nggak bisa ikut kebawa.
        </p>
      )}
      <TextField
        label="Nama Lengkap (sesuai KTP)"
        required
        value={form.fullName}
        onChange={(v) => update("fullName", v)}
      />
      <TextField label="No KTP" required value={form.ktpNumber} onChange={(v) => update("ktpNumber", v)} />
      <TextField
        label="Tempat Lahir"
        required
        value={form.birthPlace}
        onChange={(v) => update("birthPlace", v)}
      />
      <TextField
        label="Tanggal Lahir"
        required
        type="date"
        value={form.birthDate}
        onChange={(v) => update("birthDate", v)}
      />
      <TextField
        label="Email Aktif"
        required
        type="email"
        value={form.activeEmail}
        onChange={(v) => update("activeEmail", v)}
        readOnly
        note="Ini email akun Google yang kamu pakai buat login, jadi dikunci di sini — ganti email berarti ganti akun. Kalau memang perlu pindah email, hubungi leader kamu."
      />
      <TextField
        label="No HP aktif (Whatsapp)"
        required
        type="tel"
        value={form.activePhone}
        onChange={(v) => update("activePhone", v)}
      />
      <TextAreaField
        label="Alamat Domisili"
        required
        value={form.address}
        onChange={(v) => update("address", v)}
      />
      <RadioGroup
        label="Pendidikan Terakhir"
        required
        options={EDUCATION_OPTIONS}
        value={form.education}
        onChange={(v) => update("education", v as EducationLevel)}
      />
      <TextField
        label="Nama Sekolah / Universitas (pendidikan terakhir)"
        required
        value={form.schoolName}
        onChange={(v) => update("schoolName", v)}
      />
      <TextField
        label="Kota Sekolah / Universitas"
        required
        value={form.schoolCity}
        onChange={(v) => update("schoolCity", v)}
      />
      <TextField
        label="Tahun Kelulusan"
        required
        value={form.graduationYear}
        onChange={(v) => update("graduationYear", v)}
      />

      <p className="px-1 text-xs text-ink-500">
        Upload dokumen — foto jelas &amp; tidak buram, maks. 100MB per file.
      </p>

      <FileField
        label="Foto KTP"
        required
        file={files.ktp}
        existingUrl={null}
        onChange={(f) => setFiles((cur) => ({ ...cur, ktp: f }))}
      />
      <FileField
        label="Foto Selfie (tanpa pegang KTP)"
        required
        file={files.selfie}
        existingUrl={null}
        onChange={(f) => setFiles((cur) => ({ ...cur, selfie: f }))}
      />
      <FileField
        label="Kartu Keluarga"
        required
        file={files.familyCard}
        existingUrl={null}
        onChange={(f) => setFiles((cur) => ({ ...cur, familyCard: f }))}
      />
      <FileField
        label="Foto buku tabungan halaman depan / rekening koran bagian atas (terlihat nama bank, no rekening dan nama pemilik rekening)"
        required
        file={files.savings}
        existingUrl={null}
        onChange={(f) => setFiles((cur) => ({ ...cur, savings: f }))}
      />
      <FileField
        label="Foto KTP Pasangan (Suami/Istri) jika sudah berkeluarga"
        file={files.spouse}
        existingUrl={null}
        onChange={(f) => setFiles((cur) => ({ ...cur, spouse: f }))}
      />

      <RadioGroup
        label="Pengundang / Unit"
        required
        options={pengundangUnitOptions.map((u) => ({ value: u, label: u }))}
        value={form.pengundangUnit}
        onChange={(v) => update("pengundangUnit", v)}
      />

      {error && (
        <p role="alert" className="px-1 text-danger-500">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4 px-1">
        <button
          type="submit"
          disabled={status === "uploading" || status === "saving"}
          className="rounded-full bg-brand-navy-700 px-6 py-2.5 font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
        >
          {status === "uploading"
            ? "Mengupload…"
            : status === "saving"
              ? "Menyimpan…"
              : "Simpan"}
        </button>
      </div>
    </form>
  );
}
