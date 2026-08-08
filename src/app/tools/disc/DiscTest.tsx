"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DISC_QUESTIONS,
  DISC_TRAITS,
  type DiscQuestion,
  type DiscTrait,
} from "@/lib/disc/questions";
import { scoreDisc, type DiscResult } from "@/lib/disc/score";
import { spectrumWidths } from "@/lib/disc/spectrum";
import { DISC_PROFILES, TRAIT_META } from "@/content/disc-profiles";
import { saveDiscLead } from "./actions";
import ShareCardButton from "./ShareCardButton";

// Three screens, each owning the viewport (Plan 22): intro → test → result.
// `result` stays derived from a complete answer sheet; `intro` is explicit so
// a resumed session can skip straight past it.
type Phase = "intro" | "resume" | "test";
type LeadStatus = "idle" | "saving" | "saved";
type DiscMember = { name: string; email: string };
type Answers = (DiscTrait | null)[];

// A tap has to be acknowledged before the question changes under the thumb —
// long enough to register the selected state, short enough not to feel slow.
const ACK_MS = 150;

// The header is 4.5rem (--spacing-header); each screen takes the rest.
const SCREEN_MIN_H = "min-h-[calc(100dvh-4.5rem)]";

const emptyAnswers = (): Answers => DISC_QUESTIONS.map(() => null);

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

// Versioned: if the bank ever changes length, a stored sheet is discarded
// rather than misapplied. `answers.length` is checked against the live bank
// on read as well, so a stale payload can't survive a bank edit either.
const STORAGE_KEY = "disc-test-v1";

type StoredSession = { step: number; answers: Answers };

function isTrait(value: unknown): value is DiscTrait {
  return DISC_TRAITS.includes(value as DiscTrait);
}

// Every storage call is wrapped: Safari private mode and a full quota both
// throw, and the test is still perfectly usable without persistence.
function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { step, answers } = parsed as Partial<StoredSession>;
    if (!Array.isArray(answers) || answers.length !== DISC_QUESTIONS.length) {
      return null;
    }

    const clean: Answers = answers.map((a) => (isTrait(a) ? a : null));
    if (clean.every((a) => a === null)) return null;

    const at =
      typeof step === "number" && step >= 0 && step < DISC_QUESTIONS.length
        ? step
        : 0;
    return { step: at, answers: clean };
  } catch {
    return null;
  }
}

function writeStored(session: StoredSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Degrade to in-memory only — the previous behaviour.
  }
}

function clearStored(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
}

// Storage is only ever read once, on the first client render — nothing to
// subscribe to. The pair below is what tells the server render apart from
// the client one, so the stored session never leaks into the SSR'd HTML.
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/* ------------------------------------------------------------------ */
/* Referrer copy                                                       */
/* ------------------------------------------------------------------ */

/**
 * Every string that names the person who sent the link, with the brand
 * fallback for an absent or unknown `?ref=`. One place, so the fallback can't
 * drift into copy that would confirm a code exists.
 */
function referrerCopy(name: string | null) {
  return {
    /** Used where the name is an object: "Kirim hasil ke ___". */
    who: name ?? "tim kami",
    /** Used where the name is the subject: "___ bakal chat kamu". */
    they: name ? "Dia" : "Tim kami",
    initial: (name ?? "CONNECTeam").charAt(0).toUpperCase(),
  };
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export default function DiscTest({
  user = null,
  referrerName = null,
  referrerUnit = null,
}: {
  user?: DiscMember | null;
  /** First name only, resolved server-side. Null falls back to the brand. */
  referrerName?: string | null;
  /**
   * The referrer's "Pengundang / Unit" leader, resolved server-side. Printed
   * on the share card only (Plan 23) — never in the page's own chrome, which
   * keeps to a first name.
   */
  referrerUnit?: string | null;
}) {
  // Read once — attribution for the whole session's saves rides on
  // whichever referral link the visitor arrived through, not on whatever
  // the URL happens to say at save time.
  const ref = useSearchParams().get("ref") ?? undefined;

  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [step, setStep] = useState(0);
  // Null until the visitor picks a screen for themselves — until then the
  // stored session decides, so no state has to be set from an effect.
  const [chosen, setChosen] = useState<Phase | null>(null);
  // Held while the ~150ms acknowledgment runs, so a fast double tap can't
  // answer the next question too.
  const [locked, setLocked] = useState(false);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // localStorage is an external store, and the server doesn't have one. The
  // server snapshot says "not hydrated", so the first HTML is always the
  // intro; the real read happens in the first client commit.
  const hydrated = useSyncExternalStore(subscribeNever, onClient, onServer);
  const restored = useMemo(() => (hydrated ? readStored() : null), [hydrated]);

  const phase: Phase = chosen ?? (restored ? "resume" : "intro");

  const complete = answers.every((answer) => answer !== null);
  const result = useMemo(
    () => (complete ? scoreDisc(answers as DiscTrait[]) : null),
    [complete, answers],
  );

  // One effect covers all three clears the plan asks for: reaching the
  // result, "Ulangi tes" and "Mulai dari awal" all leave the sheet either
  // complete or empty.
  useEffect(() => {
    if (phase !== "test") return;
    if (complete || answers.every((a) => a === null)) {
      clearStored();
      return;
    }
    writeStored({ step, answers });
  }, [phase, step, answers, complete]);

  useEffect(() => {
    return () => {
      if (ackTimer.current) clearTimeout(ackTimer.current);
    };
  }, []);

  const select = useCallback(
    (trait: DiscTrait) => {
      if (locked) return;

      const fresh = answers[step] === null;
      setAnswers((current) =>
        current.map((a, i) => (i === step ? trait : a)),
      );

      // Auto-advance only when the question was previously unanswered —
      // otherwise editing answer 3 of 24 teleports you forward 21 times.
      // A revisited question keeps "Lanjut →" instead.
      if (!fresh || step === DISC_QUESTIONS.length - 1) return;

      setLocked(true);
      ackTimer.current = setTimeout(() => {
        setStep((current) => current + 1);
        setLocked(false);
      }, ACK_MS);
    },
    [answers, locked, step],
  );

  function restart() {
    setAnswers(emptyAnswers());
    setStep(0);
    setChosen("test");
  }

  if (phase === "resume" && restored) {
    return (
      <ResumePrompt
        at={restored.step}
        referrerName={referrerName}
        onResume={() => {
          setAnswers(restored.answers);
          setStep(restored.step);
          setChosen("test");
        }}
        onStartOver={() => {
          clearStored();
          setAnswers(emptyAnswers());
          setStep(0);
          setChosen("intro");
        }}
      />
    );
  }

  if (phase === "intro") {
    return (
      <Intro referrerName={referrerName} onStart={() => setChosen("test")} />
    );
  }

  if (result) {
    return (
      <Results
        result={result}
        answers={answers as DiscTrait[]}
        onRestart={restart}
        user={user}
        referrerName={referrerName}
        referrerUnit={referrerUnit}
        refCode={ref}
      />
    );
  }

  return (
    <Question
      key={step}
      question={DISC_QUESTIONS[step]}
      step={step}
      answers={answers}
      locked={locked}
      onSelect={select}
      onBack={() => setStep((current) => Math.max(0, current - 1))}
      onNext={() => setStep((current) => current + 1)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Screen 1 — intro                                                    */
/* ------------------------------------------------------------------ */

function ReferrerChip({
  referrerName,
  size = "md",
  /** "invite" on the way in, "sender" once the visitor is being asked. */
  context = "invite",
}: {
  referrerName: string | null;
  size?: "sm" | "md";
  context?: "invite" | "sender";
}) {
  const { initial } = referrerCopy(referrerName);
  const small = size === "sm";

  return (
    <p
      className={`inline-flex items-center gap-2.5 self-start rounded-full border border-ink-100 bg-white text-ink-500 ${
        small ? "py-1 pl-1 pr-3 text-xs" : "py-1.5 pl-1.5 pr-4 text-sm"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full font-bold ${
          small ? "size-7 text-xs" : "size-8 text-sm"
        } ${
          referrerName
            ? "bg-brand-navy-700 text-white"
            : "bg-ink-100 text-ink-500"
        }`}
      >
        {initial}
      </span>
      {referrerName ? (
        <span>
          <b className="font-semibold text-ink-900">{referrerName}</b>
          {context === "invite" ? " ngajak kamu ikut tes ini" : " · yang ngirim link ini"}
        </span>
      ) : (
        <span>
          <b className="font-semibold text-ink-900">CONNECTeam</b>
          {" · tes gaya kerja"}
        </span>
      )}
    </p>
  );
}

/** The four-colour strip, as a teaser for what the result looks like. */
function TraitStrip() {
  return (
    <div
      aria-hidden="true"
      className="mt-6 flex h-2.5 overflow-hidden rounded-full"
    >
      {DISC_TRAITS.map((trait) => (
        <span key={trait} className={`w-1/4 ${TRAIT_META[trait].barClass}`} />
      ))}
    </div>
  );
}

function Intro({
  referrerName,
  onStart,
}: {
  referrerName: string | null;
  onStart: () => void;
}) {
  return (
    <section
      className={`mx-auto flex w-full max-w-lg flex-col px-6 pb-8 pt-6 ${SCREEN_MIN_H}`}
    >
      <ReferrerChip referrerName={referrerName} />

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">
        Kenalan sama gaya kerjamu
      </h1>
      <p className="mt-3 text-ink-500">
        {DISC_QUESTIONS.length} pertanyaan, gak ada jawaban benar atau salah. Di
        akhir kamu lihat gaya kerjamu — dan gimana itu kepake buat jualan dan
        bangun tim.
      </p>

      <TraitStrip />
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-ink-500">
        {DISC_TRAITS.map((trait) => (
          <li key={trait}>{`${trait} · ${TRAIT_META[trait].label}`}</li>
        ))}
      </ul>

      <ul className="mt-7 flex flex-col gap-2 border-t border-ink-100 pt-6 text-sm text-ink-700">
        {[
          "Gaya kerjamu, dijelasin pakai bahasa sehari-hari",
          "Kekuatan kamu dan hal yang perlu dijaga",
          "Gimana itu kepake buat jualan dan bangun tim",
        ].map((item) => (
          <li key={item} className="flex gap-2.5">
            <span aria-hidden="true" className="font-bold text-success-500">
              &#10003;
            </span>
            {item}
          </li>
        ))}
      </ul>

      {/* Pinned to the bottom of the screen — one action, nothing under it. */}
      <div className="mt-auto flex flex-col gap-3 pt-10">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full bg-brand-navy-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-navy-800"
        >
          Mulai tes
        </button>
        <p className="text-center text-xs text-ink-500">
          ~2 menit &middot; gratis &middot; hasilnya langsung kelihatan
        </p>
      </div>
    </section>
  );
}

function ResumePrompt({
  at,
  referrerName,
  onResume,
  onStartOver,
}: {
  at: number;
  referrerName: string | null;
  onResume: () => void;
  onStartOver: () => void;
}) {
  return (
    <section
      className={`mx-auto flex w-full max-w-lg flex-col justify-center gap-6 px-6 py-10 ${SCREEN_MIN_H}`}
    >
      <ReferrerChip referrerName={referrerName} />

      <div className="rounded-2xl border border-ink-100 bg-white p-5">
        <h1 className="text-lg font-semibold text-ink-900">
          {`Lanjutin dari pertanyaan ${at + 1}?`}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Jawaban kamu masih kesimpen di HP ini.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="rounded-full bg-brand-navy-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-800"
          >
            Lanjutin
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-full border border-brand-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy-700 hover:bg-brand-navy-50"
          >
            Mulai dari awal
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 2 — the test                                                 */
/* ------------------------------------------------------------------ */

function Question({
  question,
  step,
  answers,
  locked,
  onSelect,
  onBack,
  onNext,
}: {
  question: DiscQuestion;
  step: number;
  answers: Answers;
  locked: boolean;
  onSelect: (trait: DiscTrait) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { statements } = question;
  const answer = answers[step];
  const picked = statements.findIndex((s) => s.trait === answer);
  const answered = answers.filter((a) => a !== null).length;
  const showNext = picked >= 0 && step < DISC_QUESTIONS.length - 1;

  const headingRef = useRef<HTMLHeadingElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Roving tabstop: the pick if there is one, else the first option. Set
  // once — this component is keyed by `step`, so each question gets a fresh
  // one instead of inheriting the last question's focus position.
  const [roving, setRoving] = useState(() => Math.max(0, picked));

  // Focus follows the question, so a screen reader (and a keyboard user)
  // lands on the new prompt instead of staying on a button that just moved.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // 1–4 are the desktop path. Bound to the window rather than the group
  // because a tap leaves focus on a button that is about to be replaced.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= statements.length) {
        return;
      }

      event.preventDefault();
      setRoving(index);
      onSelect(statements[index].trait);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [statements, onSelect]);

  // Arrows move focus without selecting. A standard radiogroup selects on
  // arrow, but selecting here advances the question — so the two are split:
  // arrows to look, Space/Enter (or 1–4, or a tap) to choose.
  function handleArrows(event: React.KeyboardEvent, index: number) {
    const last = statements.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = index === 0 ? last : index - 1;
    }
    if (next === null) return;

    event.preventDefault();
    setRoving(next);
    optionRefs.current[next]?.focus();
  }

  return (
    <section className={`mx-auto flex w-full max-w-lg flex-col ${SCREEN_MIN_H}`}>
      <div className="sticky top-0 z-10 flex-none border-b border-ink-100 bg-white px-5 pb-3.5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 0}
            className="text-sm font-semibold text-ink-700 hover:text-brand-red-600 disabled:text-ink-300 disabled:hover:text-ink-300"
          >
            &larr; Sebelumnya
          </button>
          <span className="text-sm tabular-nums text-ink-500">
            <b className="text-base font-semibold text-brand-navy-700">
              {step + 1}
            </b>{" "}
            / {DISC_QUESTIONS.length}
          </span>
        </div>

        {/* One tick per question, filled by *answered* count — so the last
            answer reads 24/24 rather than a bar stuck at 96%. */}
        <div
          role="progressbar"
          aria-label="Progres tes"
          aria-valuemin={0}
          aria-valuemax={DISC_QUESTIONS.length}
          aria-valuenow={answered}
          aria-valuetext={`${answered} dari ${DISC_QUESTIONS.length} pertanyaan terjawab`}
          className="mt-2.5 flex gap-0.5"
        >
          {answers.map((value, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index === step
                  ? "bg-brand-red-500"
                  : value !== null
                    ? "bg-brand-navy-700"
                    : "bg-ink-100"
              }`}
            />
          ))}
        </div>
      </div>

      <p aria-live="polite" role="status" className="sr-only">
        {`Pertanyaan ${step + 1} dari ${DISC_QUESTIONS.length}`}
      </p>

      {/* Fixed-height well, sized to the longest prompt in the bank at 375px:
          the four options land in the same place on every question instead of
          shifting under the thumb. A longer future prompt grows it. */}
      <div className="flex min-h-[148px] flex-none flex-col px-5 pt-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold leading-snug tracking-tight text-ink-900 outline-none"
        >
          {question.prompt}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Pilih yang paling mirip sama kamu — bukan yang paling ideal.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label={question.prompt}
        className="flex flex-col gap-2.5 px-5"
      >
        {statements.map((statement, index) => {
          const selected = index === picked;
          return (
            <button
              key={statement.trait}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={index === roving ? 0 : -1}
              disabled={locked}
              onClick={() => {
                setRoving(index);
                onSelect(statement.trait);
              }}
              onKeyDown={(event) => handleArrows(event, index)}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left leading-snug transition-colors ${
                selected
                  ? "border-brand-navy-700 bg-brand-navy-50 text-ink-900 ring-3 ring-brand-navy-100"
                  : "border-ink-100 bg-white text-ink-900 hover:border-brand-navy-300 hover:bg-ink-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-6 shrink-0 place-items-center rounded-lg border text-xs font-bold tabular-nums ${
                  selected
                    ? "border-brand-navy-700 bg-brand-navy-700 text-white"
                    : "border-ink-100 bg-ink-50 text-ink-500"
                }`}
              >
                {index + 1}
              </span>
              {statement.text}
            </button>
          );
        })}
      </div>

      {/* "Lanjut →" only shows on a revisited question — a fresh answer
          advances itself. The keyboard hint is desktop-only, so on a phone
          the whole bar stays out of the way until there's a reason for it. */}
      <div
        className={`mt-auto flex-none items-center justify-between gap-3 border-t border-ink-100 px-5 py-3.5 ${
          showNext ? "flex" : "hidden sm:flex"
        }`}
      >
        <span className="hidden text-xs text-ink-300 sm:inline">
          Tekan 1&ndash;4 di keyboard
        </span>
        {showNext && (
          <button
            type="button"
            onClick={onNext}
            className="ml-auto text-sm font-semibold text-brand-navy-700 hover:text-brand-navy-800"
          >
            Lanjut &rarr;
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 3 — the result                                               */
/* ------------------------------------------------------------------ */

// The label sits on the segment's own fill. brand-yellow-400 is far too light
// for white text, so I gets ink; the rest keep white.
const SPECTRUM_LABEL: Record<DiscTrait, string> = {
  D: "text-white",
  I: "text-ink-900",
  S: "text-white",
  C: "text-white",
};

function Results({
  result,
  answers,
  onRestart,
  user,
  referrerName,
  referrerUnit,
  refCode,
}: {
  result: DiscResult;
  answers: DiscTrait[];
  onRestart: () => void;
  user: DiscMember | null;
  referrerName: string | null;
  referrerUnit: string | null;
  refCode?: string;
}) {
  const profile = DISC_PROFILES[result.profileKey];
  const widths = spectrumWidths(result.percentages);
  // Same ordering rule as scoring: by score, ties falling back to canonical
  // D-I-S-C order — which puts the dominant one or two at the top.
  const ranked = [...DISC_TRAITS].sort(
    (a, b) => result.scores[b] - result.scores[a],
  );

  return (
    <section className={`bg-ink-50 ${SCREEN_MIN_H}`}>
      <div className="mx-auto w-full max-w-lg px-4 py-5">
        <article className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="h-2 bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-red-500">
              Hasil kamu
            </p>
            <h1 className="mt-1.5 text-4xl font-bold leading-none tracking-tight text-ink-900">
              {profile.title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">{profile.blend}</p>

            {/* Decorative: the ranked list below states every trait and its
                percentage in text. */}
            <div
              aria-hidden="true"
              className="mt-4 flex h-8 overflow-hidden rounded-xl"
            >
              {DISC_TRAITS.map((trait) => {
                const dominant = result.dominant.includes(trait);
                return (
                  <span
                    key={trait}
                    style={{ width: `${widths[trait]}%` }}
                    className={`grid place-items-center whitespace-nowrap text-xs font-bold ${
                      TRAIT_META[trait].barClass
                    } ${SPECTRUM_LABEL[trait]} ${dominant ? "" : "opacity-40"}`}
                  >
                    {dominant ? `${trait} ${result.percentages[trait]}%` : ""}
                  </span>
                );
              })}
            </div>

            <ul className="mt-3.5 flex flex-col gap-2">
              {ranked.map((trait) => {
                const dominant = result.dominant.includes(trait);
                return (
                  <li key={trait} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-sm ${TRAIT_META[trait].barClass}`}
                    />
                    <span
                      className={
                        dominant
                          ? "font-semibold text-ink-900"
                          : "text-ink-700"
                      }
                    >
                      {`${trait} · ${TRAIT_META[trait].label}`}
                    </span>
                    {dominant && (
                      <span className="rounded border border-brand-navy-100 bg-brand-navy-50 px-1.5 text-[0.625rem] font-bold uppercase tracking-wide text-brand-navy-700">
                        dominan
                      </span>
                    )}
                    <span
                      className={`ml-auto tabular-nums ${
                        dominant
                          ? "font-semibold text-ink-900"
                          : "text-ink-500"
                      }`}
                    >
                      {result.percentages[trait]}%
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 text-ink-700">{profile.summary}</p>
          </div>
        </article>

        <div className="mt-3.5 rounded-2xl border border-ink-100 bg-white p-4">
          <h2 className="font-semibold text-ink-900">Kekuatan kamu</h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {profile.strengths.map((strength) => (
              <li key={strength} className="flex gap-2.5 text-sm text-ink-700">
                <span aria-hidden="true" className="font-bold text-success-500">
                  &#10003;
                </span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3.5 rounded-2xl border border-brand-yellow-100 bg-brand-yellow-50 p-4">
          <h2 className="font-semibold text-ink-900">
            Gimana ini kepake di kerjaan
          </h2>
          <p className="mt-2 text-sm text-ink-700">{profile.atWork}</p>
        </div>

        <div className="mt-3.5 rounded-2xl border border-ink-100 bg-ink-50 p-4">
          <h2 className="font-semibold text-ink-900">Yang perlu dijaga</h2>
          <p className="mt-2 text-sm text-ink-700">{profile.watchOut}</p>
        </div>

        <LeadCapture
          answers={answers}
          result={result}
          user={user}
          referrerName={referrerName}
          referrerUnit={referrerUnit}
          refCode={refCode}
        />

        {/* The result is the most naturally shareable thing here, so the card
            is offered whatever the visitor did about the ask — above "Ulangi
            tes", which stays the quiet last link. */}
        <div className="mt-5 flex flex-col gap-3 border-t border-ink-100 pt-5">
          <ShareCardButton
            result={result}
            title={profile.title}
            blend={profile.blend}
            refCode={refCode}
            unitName={referrerUnit}
          />
          <button
            type="button"
            onClick={onRestart}
            className="text-center text-sm text-ink-500 underline hover:text-ink-700"
          >
            Ulangi tes
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The one ask                                                         */
/* ------------------------------------------------------------------ */

function LeadCapture({
  answers,
  result,
  user,
  referrerName,
  referrerUnit,
  refCode,
}: {
  answers: DiscTrait[];
  result: DiscResult;
  user: DiscMember | null;
  referrerName: string | null;
  referrerUnit: string | null;
  refCode?: string;
}) {
  const profile = DISC_PROFILES[result.profileKey];
  const { who, they } = referrerCopy(referrerName);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<LeadStatus>(user ? "saving" : "idle");
  const [error, setError] = useState<string | null>(null);

  // Signed-in member: we already know who they are, so save under their
  // account identity instead of asking them to retype it.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        await saveDiscLead({ name: user.name, contact: user.email, answers, ref: refCode });
        if (!cancelled) setStatus("saved");
      } catch {
        if (!cancelled) {
          setStatus("idle");
          setError("Gagal menyimpan hasil kamu. Coba lagi sebentar lagi.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      await saveDiscLead({ name: name.trim(), contact: contact.trim(), answers, ref: refCode });
      setStatus("saved");
    } catch {
      setStatus("idle");
      setError("Gagal menyimpan. Coba lagi sebentar lagi.");
    }
  }

  // Members reach this page from /member/onboarding: no referrer chrome, no
  // form, no "Gabung Sekarang" — they're already in.
  if (user) {
    return (
      <div className="mt-3.5 rounded-2xl border border-success-500 bg-white p-4">
        <h2 className="font-semibold text-ink-900">
          {status === "saved" ? (
            <>
              <span aria-hidden="true" className="text-success-500">
                &#10003;
              </span>{" "}
              Hasilnya tersimpan di akun kamu
            </>
          ) : (
            "Menyimpan hasil ke akun kamu…"
          )}
        </h2>
        <p className="mt-1.5 text-sm text-ink-500">
          {user.name} &middot; {user.email}
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger-500">
            {error}
          </p>
        )}
      </div>
    );
  }

  // "Gabung Sekarang" lives here and only here — offered to someone who has
  // already said yes to a conversation, instead of competing with the ask.
  if (status === "saved") {
    return (
      <div className="mt-3.5 rounded-2xl border border-success-500 bg-white p-4">
        <h2 className="font-semibold text-ink-900">
          <span aria-hidden="true" className="text-success-500">
            &#10003;
          </span>{" "}
          {`Kekirim ke ${who}`}
        </h2>
        <p className="mt-1.5 text-sm text-ink-500">
          {`${they} bakal chat kamu lewat WhatsApp. Sambil nunggu, hasil kamu tetap bisa dilihat di halaman ini.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <ShareCardButton
            result={result}
            title={profile.title}
            blend={profile.blend}
            refCode={refCode}
            unitName={referrerUnit}
            variant="inline"
            label="Simpan gambar"
          />
          <Link
            href="/join"
            className="rounded-full bg-brand-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-600"
          >
            Lihat cara gabung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-3.5 rounded-2xl border border-brand-navy-100 bg-brand-navy-50 p-4"
    >
      <ReferrerChip referrerName={referrerName} size="sm" context="sender" />

      <h2 className="mt-3 text-lg font-semibold text-ink-900">
        {`Mau ${who} bahas hasilnya bareng kamu?`}
      </h2>
      <p className="mt-1.5 text-sm text-ink-500">
        {`${they} bakal chat kamu di WhatsApp buat ngobrolin gaya kerjamu. Gratis, gak ada kewajiban apa-apa.`}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Nama
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kamu"
            className="rounded-xl border border-ink-300 bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-300"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Nomor WhatsApp
          <input
            type="tel"
            name="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="08…"
            className="rounded-xl border border-ink-300 bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-300"
          />
        </label>
      </div>

      {/* Stated before the button, not on the confirmation screen: a visitor
          deciding whether to hand over a phone number can't be told after the
          fact — and now the disclosure can name who actually receives it. */}
      <p className="mt-2.5 text-xs text-ink-500">
        {`Nomor kamu cuma dipakai ${who} buat ngehubungi kamu lewat WhatsApp. Gak dibagi ke siapa-siapa.`}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-3.5 w-full rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
      >
        {status === "saving" ? "Mengirim…" : `Kirim hasil ke ${who}`}
      </button>
    </form>
  );
}
