"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import {
  TEST_RESULT_BUCKET,
  testResultStoragePath,
  type TestResultSource,
} from "@/lib/testResults";
import { saveTestResultLead } from "./actions";
import type { TestResultState } from "./testResultState";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Status = "idle" | "uploading" | "saving" | "error";

/**
 * Pairs an external test link (MBTI/Self Motivation stay on satupersen.net —
 * see docs/plans/04-disc-tool.md's "out of scope" note) with an in-app record
 * of the result: a screenshot the member uploads straight to Supabase
 * Storage, plus a short typed summary so it's readable without opening the
 * image. Collapsed by default (a one-line "upload di sini" prompt, or a
 * compact saved-result card) — the form only shows once the member opts in,
 * so the link list doesn't get crowded with two open forms.
 */
export default function TestResultUpload({
  source,
  userId,
  resultPlaceholder,
  initial,
}: {
  source: TestResultSource;
  userId: string;
  resultPlaceholder: string;
  initial: TestResultState | null;
}) {
  const [saved, setSaved] = useState<TestResultState | null>(initial);
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [typed, setTyped] = useState(initial?.typed ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setError(null);

    if (picked && !picked.type.startsWith("image/")) {
      setFile(null);
      setError("File harus berupa gambar (screenshot).");
      return;
    }
    if (picked && picked.size > MAX_FILE_BYTES) {
      setFile(null);
      setError("Ukuran gambar maksimal 5MB.");
      return;
    }
    setFile(picked);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Upload screenshot hasil tesnya dulu ya.");
      return;
    }
    if (!typed.trim()) {
      setError("Isi hasil tesnya juga ya.");
      return;
    }

    setError(null);
    setStatus("uploading");

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = testResultStoragePath(userId, source, ext);
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(TEST_RESULT_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      setStatus("saving");
      const next = await saveTestResultLead({
        source,
        typed: typed.trim(),
        storagePath: path,
      });

      setSaved(next);
      setEditing(false);
      setFile(null);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  if (!editing) {
    if (saved) {
      return (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-brand-navy-200 bg-white px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-ink-900">Hasil: {saved.typed}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 font-medium text-brand-navy-700 hover:text-brand-red-600"
            >
              Ganti hasil
            </button>
          </div>
          {saved.screenshotUrl && (
            <a
              href={saved.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy-700 hover:text-brand-red-600"
            >
              Lihat screenshot
            </a>
          )}
        </div>
      );
    }

    return (
      <p className="mt-1 text-sm text-ink-500">
        Sudah selesai tesnya? Screenshot hasilnya, lalu upload{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-medium text-brand-navy-700 underline hover:text-brand-red-600"
        >
          di sini
        </button>
        .
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-3 text-sm"
    >
      <label className="flex flex-col gap-1 font-medium text-ink-700">
        Screenshot hasil
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-navy-700"
        />
      </label>

      <label className="flex flex-col gap-1 font-medium text-ink-700">
        Hasilnya apa
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={resultPlaceholder}
          className="rounded-lg border border-ink-100 px-3 py-2 font-normal text-ink-900"
        />
      </label>

      {error && (
        <p role="alert" className="text-danger-500">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "uploading" || status === "saving"}
          className="rounded-full bg-brand-navy-700 px-4 py-2 font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
        >
          {status === "uploading"
            ? "Mengupload…"
            : status === "saving"
              ? "Menyimpan…"
              : "Simpan hasil"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="font-medium text-ink-500 hover:text-ink-700"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
