"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { KNOW_YOURSELF, ONBOARDING_SECTIONS } from "@/content/onboarding";
import {
  MEMBER_NAV,
  navItemHref,
  type HubSectionId,
  type MemberNavItem,
} from "@/lib/member/nav";
import { summarizeProgress } from "@/lib/progress";
import { setOnboardingItemCompletion } from "./actions";
import TestResultUpload from "./TestResultUpload";
import type { TestResultState } from "./testResultState";

type QuestHubUser = { id: string; name: string; email: string };
type TestResults = { mbti: TestResultState | null; selfMotivation: TestResultState | null };

/** "Isi Data" opens as its own full page in a new tab rather than expanding
 * inline — the real form (src/app/member/isi-data) has 16 fields including
 * 5 photo uploads, too much to fit an accordion detail. */
const ISI_DATA_HREF = "/member/isi-data";

const TEST_RESULT_PLACEHOLDER: Record<"mbti" | "selfMotivation", string> = {
  mbti: "Tipe kamu, misalnya INFJ-A",
  selfMotivation: "Skor / level motivasi kamu",
};

type PlaceholderItem = {
  icon: string;
  title: string;
  tag: "Segera hadir" | "Di luar scope";
  note?: string;
};

type PlaceholderGroup = { category?: string; items: PlaceholderItem[] };

/** The sidebar item a section id belongs to — top-level or nested one level. */
function findNavItem(section: HubSectionId): MemberNavItem | undefined {
  for (const item of MEMBER_NAV) {
    if (item.section === section) return item;
    const child = item.children?.find((c) => c.section === section);
    if (child) return child;
  }
  return undefined;
}

/** Top-level sections that still carry the reference prototype's "level"
 * badge — unrelated to whether the section is a landing page or a leaf. */
const SECTION_LEVELS: Partial<Record<HubSectionId, number>> = {
  recruiting: 2,
  selling: 3,
};

type LeafSectionId = Exclude<
  HubSectionId,
  "onboarding" | "recruiting" | "selling" | "references" | "directory"
>;

/**
 * Placeholder content per leaf section — every sidebar item except
 * "onboarding" itself (real, its 7-item accordion checklist) and the four
 * parents that render as landing pages (Recruiting/Selling/References/
 * Directory double as a menu linking to their own children, per Plan 07's
 * table). No fabricated copy or links — items ship the "Segera hadir" tag
 * until their own plan lands content, or "Di luar scope" for the
 * explicitly-deferred new-feature items.
 */
const SECTIONS: Record<LeafSectionId, PlaceholderGroup[]> = {
  "recruiting-why": [
    {
      items: [{ icon: "🤝", title: "Kenapa Recruit Dulu?", tag: "Segera hadir" }],
    },
  ],
  "recruiting-bank-fast": [
    {
      items: [
        {
          icon: "📋",
          title: "Bank Nama Rekrut + FAST",
          tag: "Di luar scope",
          note: "Tabel CRM interaktif (nama + FAST score + CSV export) — fitur baru, butuh plan terpisah (lihat Plan 08).",
        },
      ],
    },
  ],
  "recruiting-presentasi": [
    {
      items: [{ icon: "💼", title: "Presentasi Bisnis ke Calon Rekrut", tag: "Segera hadir" }],
    },
  ],
  "recruiting-handling-obj": [
    {
      items: [
        {
          icon: "🛡️",
          title: "Handling Objection Calon Rekrut",
          tag: "Segera hadir",
          note: "Format kontennya belum diputusin (\"Bentuknya apa?\" di sheet).",
        },
      ],
    },
  ],
  "selling-learning-center": [
    {
      category: "5 bagian di halaman ini (dari sheet) — baru satu yang punya nama",
      items: [
        {
          icon: "📦",
          title: "Product Details",
          tag: "Segera hadir",
          note: "Sama dengan References ↳ Recording — lihat Plan 18 soal shared content key.",
        },
      ],
    },
  ],
  "selling-bank-form": [
    {
      items: [
        {
          icon: "📋",
          title: "Bank Nama Rekrut + FORM",
          tag: "Segera hadir",
          note: "Cek dulu ke FORM.pdf asli Plan 08 sebelum dianggap konten baru.",
        },
      ],
    },
  ],
  "selling-sales-tools": [
    {
      category: "7 bagian di halaman ini (dari sheet) — baru dua yang punya nama",
      items: [
        { icon: "💰", title: "Tabel Premi", tag: "Segera hadir", note: "Dipindah dari Plan 10." },
        { icon: "🩺", title: "Tabel Medical", tag: "Segera hadir", note: "Dipindah dari Plan 10." },
      ],
    },
  ],
  "references-recording": [
    {
      category: "2 bagian di halaman ini (dari sheet) — baru satu yang punya nama",
      items: [
        {
          icon: "📦",
          title: "Product Details",
          tag: "Segera hadir",
          note: "Sama dengan Selling ↳ Learning Center — lihat Plan 18 soal shared content key.",
        },
      ],
    },
  ],
  "references-commission": [
    {
      items: [
        {
          icon: "💵",
          title: "Commission",
          tag: "Segera hadir",
          note: "Sebelumnya bagian dari tabel referensi Sales Kit Plan 09, sekarang item sendiri.",
        },
      ],
    },
  ],
  "references-prestige": [
    { items: [{ icon: "🏅", title: "Prestige", tag: "Segera hadir" }] },
  ],
  "references-schedule-book": [
    {
      items: [
        {
          icon: "📅",
          title: "Schedule Book (PDF Download)",
          tag: "Segera hadir",
          note: "Salah satu PDF Starter Kit yang belum ada link — lihat 00-overview.md.",
        },
      ],
    },
  ],
  "references-prupay-link": [
    {
      items: [
        {
          icon: "💳",
          title: "Prupay Link",
          tag: "Segera hadir",
          note: "Dulu \"PRU PayLink\", dipindah dari Plan 11 (Official Systems).",
        },
      ],
    },
  ],
  "references-claim": [
    {
      items: [
        { icon: "🧾", title: "How to Claim", tag: "Segera hadir" },
        { icon: "📄", title: "Bukti Claim", tag: "Segera hadir" },
      ],
    },
  ],
  "references-contests": [
    { items: [{ icon: "🏆", title: "Reward & Campaign", tag: "Segera hadir" }] },
  ],
  "references-events": [
    { items: [{ icon: "📅", title: "Jadwal & Registrasi", tag: "Segera hadir" }] },
  ],
  "directory-yellow-pages": [
    { items: [{ icon: "📇", title: "Yellow Pages", tag: "Segera hadir" }] },
  ],
  "directory-who-is-prudential": [
    {
      items: [
        {
          icon: "🏢",
          title: "Who is Prudential",
          tag: "Segera hadir",
          note: "Sebelumnya \"Prudential Indonesia\".",
        },
      ],
    },
  ],
  "directory-who-is-mrt": [
    { items: [{ icon: "🏬", title: "Who is MRT Group", tag: "Segera hadir" }] },
  ],
  "directory-who-is-connecteam": [
    {
      items: [
        {
          icon: "🌐",
          title: "Who is Connecteam",
          tag: "Segera hadir",
          note: "Scope lama \"CONNECT with Leaders\" gak ada di sheet baru — konfirmasi ke content owner apakah dihapus atau berganti nama jadi ini, jangan diasumsikan begitu aja.",
        },
      ],
    },
  ],
  calculator: [
    {
      items: [
        {
          icon: "🧮",
          title: "Kalkulator Income",
          tag: "Segera hadir",
          note: "Tool-nya belum dibangun (Plan 05, ditunda). Begitu jadi, bagian ini yang jadi pintu masuknya.",
        },
      ],
    },
  ],
};

function KnowYourselfDetail({
  user,
  testResults,
}: {
  user: QuestHubUser;
  testResults: TestResults;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {KNOW_YOURSELF.map((link) => (
        <li key={link.label}>
          {link.href.startsWith("/") ? (
            <Link
              href={link.href}
              className="font-medium text-brand-navy-700 hover:text-brand-red-600"
            >
              {link.label}
            </Link>
          ) : (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy-700 hover:text-brand-red-600"
            >
              {link.label}
            </a>
          )}
          {link.note && <span className="text-ink-500"> — {link.note}</span>}
          {link.testSource && (
            <TestResultUpload
              source={link.testSource}
              userId={user.id}
              resultPlaceholder={TEST_RESULT_PLACEHOLDER[link.testSource]}
              initial={testResults[link.testSource]}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

// Inline version of PlaceholderTag's tag treatment, for a checklist item's
// expanded detail rather than its own card — used by every onboarding
// checklist item except Kenali Dirimu, which has real content.
function PlaceholderDetail({
  tag,
  note,
}: {
  tag: PlaceholderItem["tag"];
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <PlaceholderTag tag={tag} />
      {note && <p className="text-ink-500">{note}</p>}
    </div>
  );
}

function SectionDetail({
  id,
  user,
  testResults,
}: {
  id: (typeof ONBOARDING_SECTIONS)[number]["id"];
  user: QuestHubUser;
  testResults: TestResults;
}) {
  switch (id) {
    case "know-yourself":
      return <KnowYourselfDetail user={user} testResults={testResults} />;
    case "download-pruforce":
      return <PlaceholderDetail tag="Segera hadir" note="Dipindah dari Plan 11." />;
    case "lisensi-aaji-aasi":
      return <PlaceholderDetail tag="Segera hadir" note="Dipindah dari Plan 11." />;
    case "kelas-mfc-sertifikasi":
      return <PlaceholderDetail tag="Segera hadir" note="Dipindah dari Plan 11." />;
    case "goals-pribadi":
      return (
        <PlaceholderDetail
          tag="Di luar scope"
          note='Mini-form goals pribadi (jangka pendek/menengah/panjang) — fitur input data baru, belum di-scope. Lihat "Explicitly deferred" di Plan 07.'
        />
      );
    case "setup-wa-ig":
      return <PlaceholderDetail tag="Segera hadir" />;
  }
}

function AccordionItem({
  icon,
  title,
  description,
  checked,
  onToggleChecked,
  pending,
  href,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  checked?: boolean;
  onToggleChecked?: () => void;
  pending?: boolean;
  /** Opens its own page in a new tab instead of expanding inline — no
   * expand/collapse chevron in this mode. */
  href?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasCheckbox = onToggleChecked !== undefined;

  return (
    <div
      className={`rounded-xl border bg-white ${
        checked ? "border-brand-navy-200" : "border-ink-100"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {hasCheckbox && (
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={title}
            disabled={pending}
            onClick={onToggleChecked}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold text-white disabled:opacity-60 ${
              checked ? "border-brand-navy-700 bg-brand-navy-700" : "border-ink-200 bg-white"
            }`}
          >
            {checked ? "✓" : ""}
          </button>
        )}
        <span aria-hidden className="text-lg">
          {icon}
        </span>
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-between gap-2"
          >
            <span>
              <span className="block font-semibold text-ink-900">{title}</span>
              {description && <span className="block text-sm text-ink-500">{description}</span>}
            </span>
            <span aria-hidden className="text-ink-300">
              ↗
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex flex-1 items-center justify-between gap-2 text-left"
          >
            <span>
              <span className="block font-semibold text-ink-900">{title}</span>
              {description && <span className="block text-sm text-ink-500">{description}</span>}
            </span>
            <span
              aria-hidden
              className={`text-ink-300 transition-transform ${open ? "rotate-90" : ""}`}
            >
              ›
            </span>
          </button>
        )}
      </div>
      {!href && open && (
        <div className="px-4 pb-4 pl-12 text-sm text-ink-600">{children}</div>
      )}
    </div>
  );
}

function PlaceholderTag({ tag }: { tag: PlaceholderItem["tag"] }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${
        tag === "Di luar scope"
          ? "bg-brand-red-50 text-brand-red-600"
          : "bg-ink-100 text-ink-500"
      }`}
    >
      {tag}
    </span>
  );
}

// Unlike real Onboarding items, placeholders have nothing to reveal on
// expand — the "Segera hadir"/"Di luar scope" tag is the whole point, so it
// shows immediately instead of being hidden behind a click.
function PlaceholderList({ items }: { items: PlaceholderItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-dashed border-ink-100 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-lg">
              {item.icon}
            </span>
            <span className="flex-1 font-semibold text-ink-900">{item.title}</span>
            <PlaceholderTag tag={item.tag} />
          </div>
          {item.note && <p className="mt-1 pl-8 text-sm text-ink-500">{item.note}</p>}
        </div>
      ))}
    </div>
  );
}

// Recruiting/Selling/References/Directory have no own content — each is a
// landing page that links to its children, per Plan 07's "items with no ↳
// double as a landing page" rule. Onboarding is the one exception: its
// children render as its own accordion checklist instead (handled below),
// not as separate `?section=` pages.
function LandingLinks({ items }: { items: MemberNavItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.label}>
          <Link
            href={navItemHref(item)}
            className="flex h-full flex-col gap-1 rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-navy-200 hover:bg-brand-navy-50"
          >
            <span className="font-semibold text-ink-900">{item.label}</span>
            {item.description && (
              <span className="text-sm text-ink-500">{item.description}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function QuestHub({
  section,
  completedItemIds,
  user,
  testResults,
}: {
  section: HubSectionId;
  completedItemIds: string[];
  user: QuestHubUser;
  testResults: TestResults;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    new Set(completedItemIds),
    (state: Set<string>, action: { itemId: string; completed: boolean }) => {
      const next = new Set(state);
      if (action.completed) next.add(action.itemId);
      else next.delete(action.itemId);
      return next;
    },
  );

  const sectionIds = ONBOARDING_SECTIONS.map((s) => s.id);
  const overall = summarizeProgress(sectionIds, optimisticCompleted);

  function toggleItem(itemId: string, completed: boolean) {
    startTransition(async () => {
      setOptimisticCompleted({ itemId, completed });
      await setOnboardingItemCompletion(itemId, completed);
    });
  }

  const navItem = section === "onboarding" ? undefined : findNavItem(section);
  const isLanding = Boolean(navItem?.children?.length);
  const level = SECTION_LEVELS[section];

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 p-6 text-white">
        <div className="text-center">
          <p className="text-xl font-extrabold tracking-tight">🔥 CONNECTeam Quest</p>
          <p className="mt-1 text-sm text-white/85">
            Jalur step-by-step buat agen baru — cari klien, jual, gaspol.
          </p>
        </div>

        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width]"
              style={{ width: `${overall.percent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs font-semibold text-white/90">
            <span>Progress Onboarding</span>
            <span>{overall.percent}%</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-brand-navy-50 p-4">
        {section === "onboarding" ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-700 text-sm font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <h1 className="text-base font-bold text-ink-900">Onboarding</h1>
                <p className="text-sm text-ink-500">
                  Langkah pertama kamu sebagai agent baru
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-ink-400">
                {overall.completed}/{overall.total}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {ONBOARDING_SECTIONS.map((s) =>
                s.id === "join-isi-data" ? (
                  <AccordionItem
                    key={s.id}
                    icon={s.icon}
                    title={s.title}
                    description={s.description}
                    checked={optimisticCompleted.has(s.id)}
                    pending={isPending}
                    onToggleChecked={() => toggleItem(s.id, !optimisticCompleted.has(s.id))}
                    href={ISI_DATA_HREF}
                  />
                ) : (
                  <AccordionItem
                    key={s.id}
                    icon={s.icon}
                    title={s.title}
                    description={s.description}
                    checked={optimisticCompleted.has(s.id)}
                    pending={isPending}
                    onToggleChecked={() => toggleItem(s.id, !optimisticCompleted.has(s.id))}
                  >
                    <SectionDetail id={s.id} user={user} testResults={testResults} />
                  </AccordionItem>
                ),
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3">
              {level !== undefined && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-700 text-sm font-bold text-white">
                  {level}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-base font-bold text-ink-900">{navItem!.label}</h1>
                {navItem!.description && (
                  <p className="text-sm text-ink-500">{navItem!.description}</p>
                )}
              </div>
            </div>
            {isLanding ? (
              <LandingLinks items={navItem!.children!} />
            ) : (
              <div className="flex flex-col gap-4">
                {SECTIONS[section as LeafSectionId].map((group, i) => (
                  <div key={group.category ?? i} className="flex flex-col gap-2">
                    {group.category && (
                      <h2 className="text-xs font-bold tracking-wide text-ink-400 uppercase">
                        {group.category}
                      </h2>
                    )}
                    <PlaceholderList items={group.items} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
