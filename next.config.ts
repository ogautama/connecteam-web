import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],

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
