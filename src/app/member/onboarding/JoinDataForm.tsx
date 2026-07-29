"use client";

import { useState } from "react";
import type { MemberIntakeInput } from "@/lib/memberIntake";
import { submitJoinData } from "./actions";

const EMPTY_FIELDS: MemberIntakeInput = {
  ktpNumber: "",
  birthDate: "",
  phone: "",
  bankAccount: "",
  npwp: "",
};

const FIELD_LABELS: Record<keyof MemberIntakeInput, string> = {
  ktpNumber: "Nomor KTP",
  birthDate: "Tanggal Lahir",
  phone: "No HP",
  bankAccount: "Nomor Rekening Bank",
  npwp: "NPWP",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}

/**
 * "Join & Isi Data" — the personal-data intake form (Plan 07). "Unit
 * Pengundang" is always read-only: it comes from the member's own
 * recruiterId, not something they can type in themselves.
 */
export default function JoinDataForm({
  unitPengundang,
  initial,
}: {
  unitPengundang: string | null;
  initial: MemberIntakeInput | null;
}) {
  const [saved, setSaved] = useState<MemberIntakeInput | null>(initial);
  const [editing, setEditing] = useState(!initial);
  const [fields, setFields] = useState<MemberIntakeInput>(initial ?? EMPTY_FIELDS);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof MemberIntakeInput, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("saving");

    try {
      await submitJoinData(fields);
      setSaved(fields);
      setEditing(false);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  if (!editing && saved) {
    return (
      <div className="flex flex-col gap-2">
        <SummaryRow label="Unit Pengundang" value={unitPengundang ?? "—"} />
        <SummaryRow label={FIELD_LABELS.ktpNumber} value={saved.ktpNumber} />
        <SummaryRow label={FIELD_LABELS.birthDate} value={formatDate(saved.birthDate)} />
        <SummaryRow label={FIELD_LABELS.phone} value={saved.phone} />
        <SummaryRow label={FIELD_LABELS.bankAccount} value={saved.bankAccount} />
        <SummaryRow label={FIELD_LABELS.npwp} value={saved.npwp} />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 self-start font-medium text-brand-navy-700 underline hover:text-brand-red-600"
        >
          Ubah data
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 font-medium text-ink-700">
        Unit Pengundang
        <input
          type="text"
          value={unitPengundang ?? "Belum ada"}
          disabled
          readOnly
          className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 font-normal text-ink-500"
        />
      </label>

      <label className="flex flex-col gap-1 font-medium text-ink-700">
        {FIELD_LABELS.ktpNumber}
        <input
          type="text"
          value={fields.ktpNumber}
          onChange={(e) => update("ktpNumber", e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 font-normal text-ink-900"
        />
      </label>

      <label className="flex flex-col gap-1 font-medium text-ink-700">
        {FIELD_LABELS.birthDate}
        <input
          type="date"
          value={fields.birthDate}
          onChange={(e) => update("birthDate", e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 font-normal text-ink-900"
        />
      </label>

      <label className="flex flex-col gap-1 font-medium text-ink-700">
        {FIELD_LABELS.phone}
        <input
          type="tel"
          value={fields.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 font-normal text-ink-900"
        />
      </label>

      <label className="flex flex-col gap-1 font-medium text-ink-700">
        {FIELD_LABELS.bankAccount}
        <input
          type="text"
          value={fields.bankAccount}
          onChange={(e) => update("bankAccount", e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 font-normal text-ink-900"
        />
      </label>

      <label className="flex flex-col gap-1 font-medium text-ink-700">
        {FIELD_LABELS.npwp}
        <input
          type="text"
          value={fields.npwp}
          onChange={(e) => update("npwp", e.target.value)}
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
          disabled={status === "saving"}
          className="rounded-full bg-brand-navy-700 px-4 py-2 font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
        >
          {status === "saving" ? "Menyimpan…" : "Simpan"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => {
              setFields(saved);
              setEditing(false);
              setError(null);
            }}
            className="font-medium text-ink-500 hover:text-ink-700"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
