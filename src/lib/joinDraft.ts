import type { EducationLevel } from "@prisma/client";

/**
 * The handoff between the public /join form and the member Profile form
 * (Plan 07c): when someone fills out /join under an email that turns out to
 * already be a member, we stash what they typed here, send them to log in,
 * and prefill /member/profile with it rather than making them retype 11
 * fields.
 *
 * Text fields only, never the photos. A File can't be put back into a file
 * input by JavaScript no matter where it's stashed — that's a deliberate
 * browser security boundary — so re-picking the files is unavoidable.
 *
 * sessionStorage (not localStorage): the draft is meant to survive exactly
 * one OAuth round trip in this tab, not sit on the device indefinitely. It
 * carries the KTP number and address, so it's cleared the moment it's read.
 */
const KEY = "connecteam:join-draft:v1";

export type JoinDraft = {
  fullName: string;
  ktpNumber: string;
  birthPlace: string;
  birthDate: string;
  activeEmail: string;
  activePhone: string;
  address: string;
  education: EducationLevel | "";
  schoolName: string;
  schoolCity: string;
  graduationYear: string;
  pengundangUnit: string;
};

export function saveJoinDraft(draft: JoinDraft): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage can be unavailable (Safari private mode, quota, a blocked
    // third-party context). Losing the prefill is a nuisance, not a
    // failure — the "you already have an account" screen still shows.
  }
}

export function readJoinDraft(): JoinDraft | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Partial<JoinDraft>;
    // activeEmail is the one field the caller matches on, so a draft
    // without it is unusable rather than merely incomplete.
    if (typeof draft.activeEmail !== "string" || !draft.activeEmail) return null;
    return {
      fullName: str(draft.fullName),
      ktpNumber: str(draft.ktpNumber),
      birthPlace: str(draft.birthPlace),
      birthDate: str(draft.birthDate),
      activeEmail: draft.activeEmail,
      activePhone: str(draft.activePhone),
      address: str(draft.address),
      education: (draft.education ?? "") as EducationLevel | "",
      schoolName: str(draft.schoolName),
      schoolCity: str(draft.schoolCity),
      graduationYear: str(draft.graduationYear),
      pengundangUnit: str(draft.pengundangUnit),
    };
  } catch {
    return null;
  }
}

export function clearJoinDraft(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Same as saveJoinDraft — nothing useful to do if storage is gone.
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
