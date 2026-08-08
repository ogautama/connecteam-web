import type { PdfTheme } from "@ogautama/premium-engine/pdf";

/**
 * CONNECTeam's branding for `renderQuotationPdf` (Plan 05c). Every value here
 * is an existing token from `src/app/globals.css`, copied as a literal hex
 * because the PDF renderer runs in Node with no CSS: pdfmake needs the
 * resolved color, not a `var(--…)` reference. Keep these in sync with
 * globals.css by hand — the variable name is in the comment on each line.
 *
 * Only the fields below are themeable. `PdfTheme`'s neutrals (INK/MUTED/
 * FAINT/HAIRLINE/PANEL_BORDER) and semantic colors (the saving green, the
 * emphasis/warning red) stay module constants inside the engine *by design*,
 * so a themed site can't accidentally break the warning color or the benefit
 * ramp's contrast rules. Don't try to override them.
 */
export const CONNECTEAM_PDF_THEME: PdfTheme = {
  brandName: "CONNECTeam",

  // NOTE (verified 2026-08-08 against premium-engine@0.1.0's dist/pdf.js):
  // the shipped renderer never reads `theme.logo` — the header it draws is
  // text-only, `theme.brandName` in `theme.colors.brand`. The field exists on
  // the type, so this is forward-compatible rather than wrong, but setting it
  // today would mean carrying ~120 KB of base64 PNG in the repo for something
  // nothing reads. Add it (from `public/logo/connecteam-wordmark.png`, scaled
  // down first — the source is 5315px wide) once a renderer version honours
  // it; the Plan 05c verification step should not claim a logo renders until
  // then.

  colors: {
    brand: "#183f87", // --color-brand-navy-700
    // -800 rather than the plan's suggested -700: `protection` fills a solid
    // band that sits directly against `brand`-colored text, and at -700 the
    // two read as one flat block.
    protection: "#14346f", // --color-brand-navy-800
    payment: "#dda701", // --color-brand-yellow-500
    tint: "#f3f5f9", // --color-brand-navy-50
    // Six ascending steps of the navy scale — the engine fills the benefit
    // grid column by column from this array, so order is load-bearing.
    benefitRamp: [
      "#e3e8f1", // --color-brand-navy-100
      "#c3cde0", // --color-brand-navy-200
      "#9eaecd", // --color-brand-navy-300
      "#7088b5", // --color-brand-navy-400
      "#46659f", // --color-brand-navy-500
      "#2b4e91", // --color-brand-navy-600
    ],
    rampDark: "#183f87", // --color-brand-navy-700
    rampLight: "#c3cde0", // --color-brand-navy-200
    rampLightText: "#102958", // --color-brand-navy-900
  },
};
