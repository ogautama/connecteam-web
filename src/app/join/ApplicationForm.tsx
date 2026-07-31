"use client";

import { useState } from "react";
import type { EducationLevel } from "@prisma/client";
import {
  FileField,
  RadioGroup,
  TextAreaField,
  TextField,
} from "@/components/forms/IntakeFormFields";
import type { ApplicantInput } from "@/lib/applicant";
import {
  APPLICANT_INTAKE_BUCKET,
  applicantStoragePath,
  type ApplicantFileField,
} from "@/lib/applicantFiles";
import { EDUCATION_OPTIONS } from "@/lib/memberIntakeOptions";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { submitApplication } from "./actions";

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
  { field: "savings", label: "Foto buku tabungan / rekening koran" },
];

/**
 * The public "Join Us" application — same 16-question look as the member
 * "Isi Data" form (shared field kit in @/components/forms/IntakeFormFields),
 * but nobody's signed in here: no defaultEmail, no "initial" to resume, and
 * no edit-after-submit — once sent, the application sits in a leader's
 * review queue (src/app/member/admin/add-member) rather than being
 * something the applicant can come back and change themselves.
 */
export default function ApplicationForm({
  pengundangUnitOptions,
}: {
  pengundangUnitOptions: string[];
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<FileFields>(EMPTY_FILES);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "error" | "done">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
    for (const f of REQUIRED_FILES) {
      if (!files[f.field]) {
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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
          {status === "uploading" ? "Mengupload…" : status === "saving" ? "Mengirim…" : "Kirim"}
        </button>
      </div>
    </form>
  );
}
