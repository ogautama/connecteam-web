"use client";

import { useActionState, useState } from "react";
import type { RecruiterOption } from "@/lib/invites";
import { addMember, type AddMemberState } from "./actions";

const INITIAL_STATE: AddMemberState = { status: "idle" };

type Props = {
  recruiters: RecruiterOption[];
  /** The acting leader — whoever adds a member usually recruited them. */
  defaultRecruiterId: string;
};

/**
 * Remounting on "add another" is what resets the form: useActionState's state
 * only changes on the next submit, so a fresh key is the cheapest way to get
 * both the fields and the confirmation back to a clean slate.
 */
export default function AddMemberForm(props: Props) {
  const [attempt, setAttempt] = useState(0);

  return (
    <AddMemberFields
      key={attempt}
      {...props}
      onAddAnother={() => setAttempt((n) => n + 1)}
    />
  );
}

function AddMemberFields({
  recruiters,
  defaultRecruiterId,
  onAddAnother,
}: Props & { onAddAnother: () => void }) {
  const [state, formAction, pending] = useActionState(addMember, INITIAL_STATE);

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-brand-yellow-200 bg-brand-yellow-50 p-6">
        <h2 className="text-lg font-semibold text-ink-900">
          {state.email} udah diundang
        </h2>
        <p className="mt-1 text-ink-500">
          Kabarin dia langsung buat sign in pakai Google dengan email itu —
          sistem nggak ngirim notifikasi apa-apa.
        </p>
        <button
          type="button"
          onClick={onAddAnother}
          className="mt-4 rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800"
        >
          Tambah member lagi
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-2xl bg-white p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-semibold text-ink-900">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="nama@gmail.com"
          className="rounded-lg border border-ink-100 px-3 py-2 text-ink-900"
        />
        <p className="text-sm text-ink-500">
          Harus persis email Google yang bakal dia pakai buat sign in.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="recruiterId"
          className="text-sm font-semibold text-ink-900"
        >
          Recruiter
        </label>
        <select
          id="recruiterId"
          name="recruiterId"
          defaultValue={defaultRecruiterId}
          className="rounded-lg border border-ink-100 px-3 py-2 text-ink-900"
        >
          {recruiters.map((recruiter) => (
            <option key={recruiter.id} value={recruiter.id}>
              {recruiter.id === defaultRecruiterId ? "Kamu — " : ""}
              {recruiter.name} — {recruiter.email}
            </option>
          ))}
          <option value="">Pakai kode referral di bawah</option>
        </select>
        <p className="text-sm text-ink-500">
          Cuma kamu dan tim di bawah kamu. Orang yang belum pernah sign in
          belum ada di sini — dia baru muncul setelah undangannya kepake.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="inviteCode"
          className="text-sm font-semibold text-ink-900"
        >
          Kode referral recruiter
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          autoComplete="off"
          className="rounded-lg border border-ink-100 px-3 py-2 text-ink-900"
        />
        <p className="text-sm text-ink-500">
          Kode referral punya member yang udah aktif — bukan kode buat orang
          yang lagi diundang. Kalau salah, kosong, atau bukan orang di tim
          kamu, recruiter-nya jadi kamu.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-semibold text-ink-900">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="agent"
          className="rounded-lg border border-ink-100 px-3 py-2 text-ink-900"
        >
          <option value="agent">Agent</option>
          <option value="leader">Leader</option>
        </select>
      </div>

      <p aria-live="polite" className="text-sm font-medium text-brand-red-600">
        {state.status === "error" ? state.message : ""}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
      >
        {pending ? "Nyimpen…" : "Undang member"}
      </button>
    </form>
  );
}
