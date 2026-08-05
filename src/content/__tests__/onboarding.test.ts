import { describe, expect, test } from "vitest";
import { KNOW_YOURSELF, ONBOARDING_SECTIONS } from "../onboarding";

function isValidHref(href: string): boolean {
  if (href.startsWith("/")) return href.length > 1;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

describe("onboarding content", () => {
  test("every Know Yourself link has a label and a valid URL", () => {
    expect(KNOW_YOURSELF.length).toBeGreaterThan(0);
    for (const link of KNOW_YOURSELF) {
      expect(link.label, link.href).toBeTruthy();
      expect(isValidHref(link.href), link.href).toBe(true);
    }
  });

  test("DISC link points at our own tool, not the old external one", () => {
    const disc = KNOW_YOURSELF.find((link) => /disc/i.test(link.label));
    expect(disc?.href).toBe("/tools/disc");
  });

  test("onboarding sections (Plan 07 quest hub) have unique, stable ids", () => {
    expect(ONBOARDING_SECTIONS).toHaveLength(4);
    const ids = ONBOARDING_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of ONBOARDING_SECTIONS) {
      expect(section.title).toBeTruthy();
      expect(section.description).toBeTruthy();
      expect(section.icon).toBeTruthy();
    }
  });

  test("keeps Kenali Dirimu's stable id from the original 5-item build", () => {
    const kenaliDirimu = ONBOARDING_SECTIONS.find((s) => s.title === "Kenali Dirimu");
    expect(kenaliDirimu?.id).toBe("know-yourself");
  });

  test("Isi Data and the two license/class steps are off the checklist (2026-08-05)", () => {
    // Isi Data moved to AccountMenu's "Profile"; the AAJI/AASI and MFC steps
    // were hidden as empty placeholders with no content behind them.
    const ids = ONBOARDING_SECTIONS.map((section) => section.id);
    expect(ids).toEqual([
      "download-pruforce",
      "know-yourself",
      "goals-pribadi",
      "setup-wa-ig",
    ]);
  });

  test("keeps the placeholders that were deliberately NOT hidden", () => {
    // Guards the scope of the 2026-08-05 call: it was a specific decision
    // about licensing/class content, not a rule that every "Segera hadir"
    // placeholder gets hidden. These two are just as empty and stay.
    const ids = ONBOARDING_SECTIONS.map((section) => section.id);
    expect(ids).toContain("download-pruforce");
    expect(ids).toContain("setup-wa-ig");
  });
});
