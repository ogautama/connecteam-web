"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DISC_QUESTIONS, DISC_TRAITS, type DiscTrait } from "@/lib/disc/questions";
import { scoreDisc, type DiscResult } from "@/lib/disc/score";
import { DISC_PROFILES, TRAIT_META } from "@/content/disc-profiles";
import { saveDiscLead } from "./actions";

type LeadStatus = "idle" | "saving" | "saved";

const emptyAnswers = () => DISC_QUESTIONS.map(() => null as DiscTrait | null);

export default function DiscTest() {
  const [answers, setAnswers] = useState<(DiscTrait | null)[]>(emptyAnswers);
  const [step, setStep] = useState(0);

  const complete = answers.every((answer) => answer !== null);
  const result = useMemo(
    () => (complete ? scoreDisc(answers as DiscTrait[]) : null),
    [complete, answers],
  );

  function answer(trait: DiscTrait) {
    setAnswers((current) => current.map((a, i) => (i === step ? trait : a)));
    if (step < DISC_QUESTIONS.length - 1) setStep(step + 1);
  }

  function restart() {
    setAnswers(emptyAnswers());
    setStep(0);
  }

  if (result) {
    return <Results result={result} answers={answers as DiscTrait[]} onRestart={restart} />;
  }

  const question = DISC_QUESTIONS[step];

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between text-sm text-ink-500">
        <span>
          Pertanyaan {step + 1} dari {DISC_QUESTIONS.length}
        </span>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="font-medium text-ink-700 hover:text-brand-red-600"
          >
            &larr; Sebelumnya
          </button>
        )}
      </div>

      <div
        role="progressbar"
        aria-label="Progres tes"
        aria-valuemin={0}
        aria-valuemax={DISC_QUESTIONS.length}
        aria-valuenow={step}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div
          className="h-full rounded-full bg-brand-navy-700 transition-all"
          style={{ width: `${(step / DISC_QUESTIONS.length) * 100}%` }}
        />
      </div>

      <h2 className="mt-10 text-2xl font-bold text-ink-900">{question.prompt}</h2>
      <p className="mt-2 text-sm text-ink-500">
        Pilih satu yang paling mirip sama kamu — bukan yang paling ideal.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {question.statements.map((statement) => {
          const selected = answers[step] === statement.trait;
          return (
            <li key={statement.trait}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => answer(statement.trait)}
                className={`w-full rounded-2xl border px-5 py-4 text-left text-ink-700 transition-colors ${
                  selected
                    ? "border-brand-navy-700 bg-brand-navy-50"
                    : "border-ink-100 bg-white hover:border-brand-navy-300 hover:bg-ink-50"
                }`}
              >
                {statement.text}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Results({
  result,
  answers,
  onRestart,
}: {
  result: DiscResult;
  answers: DiscTrait[];
  onRestart: () => void;
}) {
  const profile = DISC_PROFILES[result.profileKey];

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-red-500">
        Hasil tes kamu
      </p>
      <h2 className="mt-2 text-display-sm font-bold tracking-tight text-ink-900">
        {profile.title}
      </h2>
      <p className="mt-1 text-ink-500">{profile.blend}</p>

      {/* Trait breakdown */}
      <ul className="mt-8 flex flex-col gap-4">
        {DISC_TRAITS.map((trait) => {
          const meta = TRAIT_META[trait];
          return (
            <li key={trait}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-ink-900">
                  {`${trait} · ${meta.label}`}
                </span>
                <span className="text-ink-500">{result.percentages[trait]}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${meta.barClass}`}
                  style={{ width: `${result.percentages[trait]}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-lg text-ink-700">{profile.summary}</p>

      <h3 className="mt-8 text-lg font-semibold text-ink-900">Kekuatan kamu</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {profile.strengths.map((strength) => (
          <li key={strength} className="flex gap-3 text-ink-700">
            <span aria-hidden="true" className="text-brand-red-500">
              &#10003;
            </span>
            {strength}
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-brand-yellow-50 p-6">
        <h3 className="text-lg font-semibold text-ink-900">
          Gimana ini kepake di kerjaan
        </h3>
        <p className="mt-2 text-ink-700">{profile.atWork}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-ink-50 p-6">
        <h3 className="text-lg font-semibold text-ink-900">Yang perlu dijaga</h3>
        <p className="mt-2 text-ink-700">{profile.watchOut}</p>
      </div>

      <LeadCapture answers={answers} />

      <div className="mt-10 flex flex-col items-center gap-4 border-t border-ink-100 pt-8 text-center">
        <p className="text-ink-500">
          Penasaran gimana tipe kamu jalan di tim kami?
        </p>
        <Link
          href="/join"
          className="rounded-full bg-brand-red-500 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-red-600"
        >
          Gabung Sekarang
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="text-sm font-medium text-ink-500 underline hover:text-ink-700"
        >
          Ulangi tes
        </button>
      </div>
    </section>
  );
}

function LeadCapture({ answers }: { answers: DiscTrait[] }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<LeadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Guarded here as well as in the server action — the action is what
    // actually enforces it, this is just so the user sees why nothing saved.
    if (!name.trim() || !contact.trim()) {
      setError("Isi nama dan nomor WhatsApp kamu dulu ya.");
      return;
    }

    setError(null);
    setStatus("saving");
    try {
      await saveDiscLead({ name: name.trim(), contact: contact.trim(), answers });
      setStatus("saved");
    } catch {
      setStatus("idle");
      setError("Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  if (status === "saved") {
    return (
      <div className="mt-8 rounded-2xl border border-success-500 bg-white p-6">
        <h3 className="text-lg font-semibold text-ink-900">Hasilnya tersimpan</h3>
        <p className="mt-2 text-ink-700">
          Makasih, {name.trim()}! Tim kami bakal hubungi kamu lewat WhatsApp
          buat bahas hasilnya bareng-bareng.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-8 rounded-2xl border border-ink-100 bg-white p-6"
    >
      <h3 className="text-lg font-semibold text-ink-900">
        Simpan hasilnya & ngobrol sama kami
      </h3>
      <p className="mt-2 text-sm text-ink-500">
        Tinggalin kontakmu kalau mau dibahas lebih jauh sama mentor kami. Gratis,
        gak ada kewajiban apa-apa.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Nama
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-ink-100 px-4 py-2 font-normal text-ink-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Nomor WhatsApp
          <input
            type="tel"
            name="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="rounded-xl border border-ink-100 px-4 py-2 font-normal text-ink-900"
          />
        </label>
      </div>

      {/* Stated before the button, not on the confirmation screen: "Simpan
          hasil saya" reads like saving something for yourself, so what the
          number is actually for has to be visible at the point of decision. */}
      <p className="mt-4 text-xs text-ink-500">
        Nama dan nomor kamu kami simpan, dan cuma dipakai buat mentor kami
        hubungi kamu lewat WhatsApp.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-5 rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
      >
        {status === "saving" ? "Menyimpan…" : "Simpan hasil saya"}
      </button>
    </form>
  );
}
