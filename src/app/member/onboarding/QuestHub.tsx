"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  JUST_DO_IT,
  KNOW_YOURSELF,
  LEARN_LINKS,
  LEARN_NOTE,
  LEARN_VIDEOS,
  ONBOARDING_SECTIONS,
  PLAN_YOUR_GOALS,
  STARTER_KIT,
  type OnboardingLink,
} from "@/content/onboarding";
import { summarizeProgress } from "@/lib/progress";
import { setOnboardingItemCompletion } from "./actions";

const TABS = [
  { id: "onboarding", label: "Onboarding", level: 1 },
  { id: "recruiting", label: "Recruiting", level: 2 },
  { id: "selling", label: "Selling", level: 3 },
  { id: "referensi", label: "Referensi", level: undefined },
  { id: "kontak", label: "Kontak", level: undefined },
] as const;

type TabId = (typeof TABS)[number]["id"];

type PlaceholderItem = {
  icon: string;
  title: string;
  tag: "Segera hadir" | "Di luar scope";
  note?: string;
};

const RECRUITING_ITEMS: PlaceholderItem[] = [
  { icon: "🤝", title: "Kenapa Recruit Dulu?", tag: "Segera hadir" },
  {
    icon: "📋",
    title: "Bank Nama Rekrut + FAST",
    tag: "Di luar scope",
    note: "Tabel CRM interaktif — fitur baru, butuh plan terpisah (lihat Plan 08).",
  },
  { icon: "💼", title: "Presentasi Bisnis ke Calon Rekrut", tag: "Segera hadir" },
  { icon: "🛡️", title: "Handling Objection Calon Rekrut", tag: "Segera hadir" },
];

const SELLING_ITEMS: PlaceholderItem[] = [
  { icon: "🔺", title: "Segitiga Kebutuhan (Basic)", tag: "Segera hadir" },
  { icon: "📦", title: "Kenalan 3 Produk Dasar", tag: "Segera hadir" },
  { icon: "🤝", title: "Teknik Closing", tag: "Segera hadir" },
];

const REFERENSI_GROUPS: { category: string; items: PlaceholderItem[] }[] = [
  {
    category: "Reference Data — Plan 10",
    items: [{ icon: "💰", title: "Tabel Premi & Tabel Medical", tag: "Segera hadir" }],
  },
  {
    category: "Official Systems — Plan 11",
    items: [{ icon: "🖥️", title: "PRUForce, Lisensi AAJI/AASI, Claim", tag: "Segera hadir" }],
  },
  {
    category: "Contests & Campaigns — Plan 12",
    items: [{ icon: "🏆", title: "Reward & Campaign", tag: "Segera hadir" }],
  },
  {
    category: "Events — Plan 13",
    items: [
      {
        icon: "📅",
        title: "Jadwal & Registrasi",
        tag: "Segera hadir",
        note: "Item leader-only difilter server-side begitu konten ini dibangun — bukan cuma disembunyikan lewat CSS.",
      },
    ],
  },
];

const KONTAK_ITEMS: PlaceholderItem[] = [
  { icon: "📇", title: "Yellow Pages, MRT Group, Prudential Indonesia", tag: "Segera hadir" },
];

function LinkListDetail({ links }: { links: OnboardingLink[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {links.map((link) => (
        <li key={link.label}>
          {link.href.startsWith("/") ? (
            <Link href={link.href} className="font-medium text-brand-navy-700 hover:text-brand-red-600">
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
        </li>
      ))}
    </ul>
  );
}

function ChecklistDetail({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SectionDetail({ id }: { id: (typeof ONBOARDING_SECTIONS)[number]["id"] }) {
  switch (id) {
    case "know-yourself":
      return <LinkListDetail links={KNOW_YOURSELF} />;
    case "plan-your-goals":
      return <ChecklistDetail items={PLAN_YOUR_GOALS.items} />;
    case "learn":
      return (
        <div className="flex flex-col gap-2">
          <p>
            4 video ({LEARN_VIDEOS.map((v) => v.title).join(", ")}) belum ada
            link — placeholder &quot;segera hadir&quot; sampai sumbernya didapat.
          </p>
          <LinkListDetail links={LEARN_LINKS} />
          <p className="text-ink-500">{LEARN_NOTE}</p>
        </div>
      );
    case "just-do-it":
      return <ChecklistDetail items={JUST_DO_IT.items} />;
    case "starter-kit":
      return (
        <ul className="flex flex-col gap-1">
          {STARTER_KIT.map((item) => (
            <li key={item.label}>
              {item.label}
              {!item.href && <span className="text-ink-400"> — segera hadir</span>}
            </li>
          ))}
        </ul>
      );
  }
}

function AccordionItem({
  icon,
  title,
  description,
  checked,
  onToggleChecked,
  pending,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  checked?: boolean;
  onToggleChecked?: () => void;
  pending?: boolean;
  children: React.ReactNode;
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
      </div>
      {open && <div className="px-4 pb-4 pl-12 text-sm text-ink-600">{children}</div>}
    </div>
  );
}

function PlaceholderTag({ tag }: { tag: PlaceholderItem["tag"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
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
function PlaceholderAccordion({ items }: { items: PlaceholderItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-dashed border-ink-100 bg-white px-4 py-3">
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

export default function QuestHub({ completedItemIds }: { completedItemIds: string[] }) {
  const [activeTab, setActiveTab] = useState<TabId>("onboarding");
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

  const idBase = useId();
  const sectionIds = ONBOARDING_SECTIONS.map((section) => section.id);
  const overall = summarizeProgress(sectionIds, optimisticCompleted);

  function toggleItem(itemId: string, completed: boolean) {
    startTransition(async () => {
      setOptimisticCompleted({ itemId, completed });
      await setOnboardingItemCompletion(itemId, completed);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 p-6 text-white">
        <div className="text-center">
          <h1 className="text-xl font-extrabold tracking-tight">🔥 CONNECTeam Quest</h1>
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
            <span>Progress Quest</span>
            <span>{overall.percent}%</span>
          </div>
        </div>

        <div role="tablist" aria-label="Quest Hub" className="flex flex-wrap justify-center gap-1 rounded-full bg-white/15 p-1">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${idBase}-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`${idBase}-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${
                  isActive ? "bg-white text-brand-navy-700" : "text-white/85 hover:bg-white/10"
                }`}
              >
                {tab.level !== undefined && (
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive ? "bg-brand-yellow-400 text-white" : "bg-white/25"
                    }`}
                  >
                    {tab.level}
                  </span>
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-brand-navy-50 p-4">
        <div
          role="tabpanel"
          id={`${idBase}-panel-onboarding`}
          aria-labelledby={`${idBase}-tab-onboarding`}
          hidden={activeTab !== "onboarding"}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-700 text-sm font-bold text-white">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-ink-900">Level 1 — Onboarding</h2>
              <p className="text-sm text-ink-500">Kenali diri, susun target, pelajari dasarnya</p>
            </div>
            <span className="font-mono text-sm font-semibold text-ink-400">
              {overall.completed}/{overall.total}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {ONBOARDING_SECTIONS.map((section) => (
              <AccordionItem
                key={section.id}
                icon={section.icon}
                title={section.title}
                description={section.description}
                checked={optimisticCompleted.has(section.id)}
                pending={isPending}
                onToggleChecked={() =>
                  toggleItem(section.id, !optimisticCompleted.has(section.id))
                }
              >
                <SectionDetail id={section.id} />
              </AccordionItem>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`${idBase}-panel-recruiting`}
          aria-labelledby={`${idBase}-tab-recruiting`}
          hidden={activeTab !== "recruiting"}
        >
          <div className="mb-3">
            <h2 className="text-base font-bold text-ink-900">Level 2 — Recruiting</h2>
            <p className="text-sm text-ink-500">Bangun tim dulu sebelum jualan</p>
          </div>
          <PlaceholderAccordion items={RECRUITING_ITEMS} />
        </div>

        <div
          role="tabpanel"
          id={`${idBase}-panel-selling`}
          aria-labelledby={`${idBase}-tab-selling`}
          hidden={activeTab !== "selling"}
        >
          <div className="mb-3">
            <h2 className="text-base font-bold text-ink-900">Level 3 — Selling</h2>
            <p className="text-sm text-ink-500">Bantu klien lewat asuransi, bukan hard selling</p>
          </div>
          <PlaceholderAccordion items={SELLING_ITEMS} />
        </div>

        <div
          role="tabpanel"
          id={`${idBase}-panel-referensi`}
          aria-labelledby={`${idBase}-tab-referensi`}
          hidden={activeTab !== "referensi"}
        >
          <div className="mb-3">
            <h2 className="text-base font-bold text-ink-900">Referensi</h2>
            <p className="text-sm text-ink-500">
              Klik buat buka &amp; download langsung dari situs CONNECTeam
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {REFERENSI_GROUPS.map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                <h3 className="text-xs font-bold tracking-wide text-ink-400 uppercase">
                  {group.category}
                </h3>
                <PlaceholderAccordion items={group.items} />
              </div>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`${idBase}-panel-kontak`}
          aria-labelledby={`${idBase}-tab-kontak`}
          hidden={activeTab !== "kontak"}
        >
          <div className="mb-3">
            <h2 className="text-base font-bold text-ink-900">Kontak</h2>
            <p className="text-sm text-ink-500">Direktori kontak — leader-only entries difilter server-side</p>
          </div>
          <PlaceholderAccordion items={KONTAK_ITEMS} />
        </div>
      </div>
    </div>
  );
}
