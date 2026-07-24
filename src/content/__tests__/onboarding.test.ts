import { describe, expect, test } from "vitest";
import {
  JUST_DO_IT,
  KNOW_YOURSELF,
  LEARN_LINKS,
  LEARN_VIDEOS,
  ONBOARDING_SECTIONS,
  PLAN_YOUR_GOALS,
  STARTER_KIT,
} from "../onboarding";

function isValidHref(href: string): boolean {
  if (href.startsWith("/")) return href.length > 1;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

describe("onboarding content", () => {
  test("every Know Yourself / Learn link has a label and a valid URL", () => {
    const links = [...KNOW_YOURSELF, ...LEARN_LINKS];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.label, link.href).toBeTruthy();
      expect(isValidHref(link.href), link.href).toBe(true);
    }
  });

  test("DISC link points at our own tool, not the old external one", () => {
    const disc = KNOW_YOURSELF.find((link) => /disc/i.test(link.label));
    expect(disc?.href).toBe("/tools/disc");
  });

  test("every checklist has a title and at least one item", () => {
    for (const checklist of [PLAN_YOUR_GOALS, JUST_DO_IT]) {
      expect(checklist.title).toBeTruthy();
      expect(checklist.items.length).toBeGreaterThan(0);
      for (const item of checklist.items) {
        expect(item).toBeTruthy();
      }
    }
  });

  test("every learn video has a title, and a valid URL when one is set", () => {
    expect(LEARN_VIDEOS.length).toBeGreaterThan(0);
    for (const video of LEARN_VIDEOS) {
      expect(video.title).toBeTruthy();
      if (video.href) expect(isValidHref(video.href)).toBe(true);
    }
  });

  test("starter kit has all 4 items, each with a label and a valid URL when one is set", () => {
    expect(STARTER_KIT).toHaveLength(4);
    for (const item of STARTER_KIT) {
      expect(item.label).toBeTruthy();
      if (item.href) expect(isValidHref(item.href)).toBe(true);
    }
  });

  test("onboarding sections (Plan 07 quest hub) have unique, stable ids", () => {
    expect(ONBOARDING_SECTIONS).toHaveLength(5);
    const ids = ONBOARDING_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of ONBOARDING_SECTIONS) {
      expect(section.title).toBeTruthy();
      expect(section.description).toBeTruthy();
      expect(section.icon).toBeTruthy();
    }
  });
});
