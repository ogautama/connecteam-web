import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // premium-engine's "/pdf" entry resolves its fonts, product content, and
  // locale catalogs at request time, relative to `import.meta.url`. Bundled,
  // that URL points into `.next/server/**` and every one of those reads
  // misses. Externalised, it keeps pointing at node_modules — which is what
  // the tracing rule below then has something to include.
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@ogautama/premium-engine",
  ],

  // THE 05c DEPLOYMENT TRAP, and it passes every local check: Next traces the
  // *imports* a route makes, and nothing imports these assets — `/pdf` reads
  // them with `readFileSync` at request time. Without this they never reach
  // the deployed function and the first PDF request 500s on a missing font,
  // while `npm run dev`, `npm run build` and CI all stay green (dev and a
  // local build both still have the real node_modules on disk).
  //
  // Keyed on the route whose Server Action renders the PDF: CalculatorForm is
  // the only importer of `saveQuoteAndRenderPdf`, and a Server Action is
  // served by the route that owns the component importing it. Widen this key
  // the moment a second route starts generating quotations.
  outputFileTracingIncludes: {
    "/member/calculator": [
      "node_modules/@ogautama/premium-engine/fonts/**",
      "node_modules/@ogautama/premium-engine/content/**",
      "node_modules/@ogautama/premium-engine/locales/**",
    ],
  },

  async redirects() {
    return [
      // The Profile page lived at /member/isi-data until 2026-08-06. The page
      // had been called "Profile" since 2026-08-05 (see AccountMenu) and Plan
      // 19 rebuilt it as one, so the route finally matches the name. 308 and
      // permanent because nothing is coming back to the old path — but it has
      // to keep working: /join stashes a draft and sends people through
      // `/login?next=%2Fmember%2Fisi-data` (Plan 07c), and members were told
      // to bookmark it. Query strings carry through, so an in-flight `?next=`
      // round trip survives the hop.
      {
        source: "/member/isi-data",
        destination: "/member/profile",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
