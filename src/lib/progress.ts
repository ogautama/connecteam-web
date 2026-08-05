// Pure — no Prisma/server imports, so the quest hub's client component can
// import this directly for its progress bar without bundling server-only
// code (unlike src/lib/onboardingProgress.ts, which touches Prisma).

export type ProgressSummary = {
  completed: number;
  total: number;
  percent: number;
};

export function summarizeProgress(
  sectionIds: string[],
  completedIds: ReadonlySet<string>
): ProgressSummary {
  const total = sectionIds.length;
  const completed = sectionIds.filter((id) => completedIds.has(id)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
