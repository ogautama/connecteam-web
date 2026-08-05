import { describe, expect, test } from "vitest";
import {
  KNOW_YOURSELF,
  ONBOARDING_SECTIONS,
  PRUFORCE_DOWNLOAD,
  PRUFORCE_INSTALL,
  PRUFORCE_UPDATE_WARNING,
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
    // placeholder gets hidden. Both were just as empty and stayed —
    // download-pruforce has since been filled in.
    const ids = ONBOARDING_SECTIONS.map((section) => section.id);
    expect(ids).toContain("download-pruforce");
    expect(ids).toContain("setup-wa-ig");
  });
});

describe("PRUForce content", () => {
  test("the download link is the agent-portal page, over https", () => {
    expect(PRUFORCE_DOWNLOAD.label).toBeTruthy();
    expect(isValidHref(PRUFORCE_DOWNLOAD.href)).toBe(true);
    expect(new URL(PRUFORCE_DOWNLOAD.href).hostname).toBe("portals.prudential.co.id");
  });

  test("never links a store or a download file directly", () => {
    // PRUForce is on neither store in Indonesia, the portal's Android URL is
    // a 7-day signed GCS link, and its iOS one is an itms-services://
    // manifest. Any of the three here would be wrong or would rot.
    expect(PRUFORCE_DOWNLOAD.href).not.toMatch(
      /play\.google\.com|apps\.apple\.com|storage\.googleapis\.com|itms-services|\.apk/i,
    );
  });

  test("covers both platforms, each with steps", () => {
    expect(PRUFORCE_INSTALL.map((guide) => guide.platform)).toEqual(["android", "ios"]);
    for (const guide of PRUFORCE_INSTALL) {
      expect(guide.label, guide.platform).toBeTruthy();
      expect(guide.icon, guide.platform).toBeTruthy();
      expect(guide.steps.length, guide.platform).toBeGreaterThan(0);
      for (const step of guide.steps) expect(step, guide.platform).toBeTruthy();
    }
  });

  test("iOS steps say Safari — the enterprise install works nowhere else", () => {
    const ios = PRUFORCE_INSTALL.find((guide) => guide.platform === "ios");
    expect(ios?.steps.join(" ")).toMatch(/Safari/);
  });

  test("the update warning leads with syncing, so nobody loses a draft", () => {
    expect(PRUFORCE_UPDATE_WARNING.title).toBeTruthy();
    expect(PRUFORCE_UPDATE_WARNING.points.length).toBeGreaterThan(0);
    expect(PRUFORCE_UPDATE_WARNING.points[0]).toMatch(/SYNC DATA/);
  });
});
