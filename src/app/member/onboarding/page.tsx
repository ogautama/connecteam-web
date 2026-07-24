import type { Metadata } from "next";
import Link from "next/link";
import {
  JUST_DO_IT,
  KNOW_YOURSELF,
  LEARN_LINKS,
  LEARN_NOTE,
  LEARN_VIDEOS,
  PLAN_YOUR_GOALS,
  STARTER_KIT,
  type OnboardingChecklist,
  type OnboardingLink,
} from "@/content/onboarding";

export const metadata: Metadata = {
  title: "Get Started — CONNECTeam",
};

const CARD_CLASS =
  "flex h-full flex-col gap-1 rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-navy-200 hover:bg-brand-navy-50";

const PENDING_CARD_CLASS =
  "flex h-full flex-col gap-1 rounded-xl border border-dashed border-ink-100 bg-white p-4 text-ink-400";

function LinkCard({ link }: { link: OnboardingLink }) {
  const content = (
    <>
      <span className="font-semibold text-ink-900">{link.label}</span>
      {link.note && <span className="text-sm text-ink-500">{link.note}</span>}
    </>
  );

  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} className={CARD_CLASS}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={CARD_CLASS}
    >
      {content}
    </a>
  );
}

function Checklist({ checklist }: { checklist: OnboardingChecklist }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <h3 className="font-semibold text-ink-900">{checklist.title}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {checklist.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-ink-500">
            <span
              aria-hidden
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-navy-300"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Get Started
        </h1>
        <p className="mt-1 text-ink-500">
          Langkah pertama kamu sebagai agent baru — kenali diri sendiri,
          susun target, dan pelajari dasarnya.
        </p>
      </div>

      <section aria-labelledby="know-yourself-heading" className="flex flex-col gap-3">
        <h2 id="know-yourself-heading" className="text-lg font-semibold text-ink-900">
          Kenali Dirimu
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {KNOW_YOURSELF.map((link) => (
            <li key={link.label}>
              <LinkCard link={link} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={PLAN_YOUR_GOALS.title}>
        <Checklist checklist={PLAN_YOUR_GOALS} />
      </section>

      <section aria-labelledby="learn-heading" className="flex flex-col gap-3">
        <h2 id="learn-heading" className="text-lg font-semibold text-ink-900">
          Pelajari Sesuatu yang Baru
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LEARN_VIDEOS.map((video) =>
            video.href ? (
              <li key={video.title}>
                <LinkCard link={{ label: video.title, href: video.href }} />
              </li>
            ) : (
              <li key={video.title} className={PENDING_CARD_CLASS}>
                <span className="font-semibold text-ink-500">{video.title}</span>
                <span className="text-sm">Segera hadir</span>
              </li>
            ),
          )}
          {LEARN_LINKS.map((link) => (
            <li key={link.label}>
              <LinkCard link={link} />
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-500">{LEARN_NOTE}</p>
      </section>

      <section aria-label={JUST_DO_IT.title}>
        <Checklist checklist={JUST_DO_IT} />
      </section>

      <section aria-labelledby="starter-kit-heading" className="flex flex-col gap-3">
        <h2 id="starter-kit-heading" className="text-lg font-semibold text-ink-900">
          Starter Kit
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STARTER_KIT.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CARD_CLASS}
                >
                  <span className="font-semibold text-ink-900">{item.label}</span>
                  <span className="text-sm text-ink-500">Unduh PDF</span>
                </a>
              ) : (
                <div className={PENDING_CARD_CLASS}>
                  <span className="font-semibold text-ink-500">{item.label}</span>
                  <span className="text-sm">Segera hadir</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
