"use client";

import { useState } from "react";
import type { EducationLevel } from "@prisma/client";
import {
  FileField,
  IntakeSummary,
  RadioGroup,
  TextAreaField,
  TextField,
} from "@/components/forms/IntakeFormFields";
import type { ApplicantAsIntake } from "@/lib/applicant";
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

/**
 * "Isi Data" — the personal-data intake form (Plan 07), fields copied from
 * the real Google Form this replaces (that form is gated behind sign-in, so
 * these were transcribed from a screenshot the user provided, not
 * fabricated). "Pengundang / Unit" is the one field that isn't a fixed
 * copy — it's the live leader list, passed down from the page rather than a
 * hardcoded picklist. Photo fields upload straight to Supabase Storage from
 * the browser, same pattern as TestResultUpload.tsx — the server action
 * only ever sees the resulting storage path.
 */
export default function JoinDataForm({
  userId,
  defaultEmail,
  initial,
  pengundangUnitOptions,
  linkedApplication,
}: {
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
}) {
  const [saved, setSaved] = useState<MemberIntakeRecord | null>(initial);
  const [editing, setEditing] = useState(!initial && !linkedApplication);
  const [form, setForm] = useState<FormState>(
    initial ? formFromSaved(initial) : emptyForm(defaultEmail),
  );
  const [files, setFiles] = useState<FileFields>(EMPTY_FILES);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const requiredFiles: { field: MemberIntakeFileField; label: string; existingKey: string | null }[] = [
    { field: "ktp", label: "Foto KTP", existingKey: saved?.ktpPhotoKey ?? null },
    {
      field: "selfie",
      label: "Foto Selfie (tanpa pegang KTP)",
      existingKey: saved?.selfiePhotoKey ?? null,
    },
    { field: "familyCard", label: "Kartu Keluarga", existingKey: saved?.familyCardPhotoKey ?? null },
    {
      field: "savings",
      label: "Foto buku tabungan / rekening koran",
      existingKey: saved?.savingsPhotoKey ?? null,
    },
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
          uploadIfNeeded("ktp", files.ktp, saved?.ktpPhotoKey ?? null),
          uploadIfNeeded("selfie", files.selfie, saved?.selfiePhotoKey ?? null),
          uploadIfNeeded("familyCard", files.familyCard, saved?.familyCardPhotoKey ?? null),
          uploadIfNeeded("savings", files.savings, saved?.savingsPhotoKey ?? null),
          uploadIfNeeded("spouse", files.spouse, saved?.spousePhotoKey ?? null),
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
      setEditing(false);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  if (!editing && saved) {
    return (
      <IntakeSummary
        data={{ ...saved, pengundangUnitLabel: saved.pengundangUnit }}
        onEdit={() => setEditing(true)}
      />
    );
  }

  if (!saved && linkedApplication) {
    return (
      <IntakeSummary
        data={{ ...linkedApplication, pengundangUnitLabel: linkedApplication.pengundangUnit }}
        note="Data ini diambil dari aplikasi Join Us kamu yang udah diterima. Belum bisa diubah dari sini — hubungi leader kamu kalau ada yang salah."
      />
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
        existingUrl={saved?.ktpPhotoUrl ?? null}
        onChange={(f) => setFiles((cur) => ({ ...cur, ktp: f }))}
      />
      <FileField
        label="Foto Selfie (tanpa pegang KTP)"
        required
        file={files.selfie}
        existingUrl={saved?.selfiePhotoUrl ?? null}
        onChange={(f) => setFiles((cur) => ({ ...cur, selfie: f }))}
      />
      <FileField
        label="Kartu Keluarga"
        required
        file={files.familyCard}
        existingUrl={saved?.familyCardPhotoUrl ?? null}
        onChange={(f) => setFiles((cur) => ({ ...cur, familyCard: f }))}
      />
      <FileField
        label="Foto buku tabungan halaman depan / rekening koran bagian atas (terlihat nama bank, no rekening dan nama pemilik rekening)"
        required
        file={files.savings}
        existingUrl={saved?.savingsPhotoUrl ?? null}
        onChange={(f) => setFiles((cur) => ({ ...cur, savings: f }))}
      />
      <FileField
        label="Foto KTP Pasangan (Suami/Istri) jika sudah berkeluarga"
        file={files.spouse}
        existingUrl={saved?.spousePhotoUrl ?? null}
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
        {saved && (
          <button
            type="button"
            onClick={() => {
              setForm(formFromSaved(saved));
              setFiles(EMPTY_FILES);
              setEditing(false);
              setError(null);
            }}
            className="font-medium text-ink-500 hover:text-ink-700"
          >
            Batal
          </button>
        )}
        <span className="text-sm text-ink-500">Otomatis kecentang di checklist Onboarding</span>
      </div>
    </form>
  );
}
