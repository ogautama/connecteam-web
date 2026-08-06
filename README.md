# connecteam-web

CONNECTeam website — public marketing site + member space.

Rebuild of the previous Google Sites–based site (connecteam.id) and member portal
(previously at sites.google.com/view/connecteam), moving to a self-hosted
Next.js app so we can rethink the content/IA and add interactive tools
(e.g. a calculator/lead-gen tool) instead of relying on embedded Google Forms.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Vercel, from `main`. Static assets still serve from whichever CDN edge is
nearest the visitor; only function execution is pinned.

`vercel.json` pins functions to **`sin1` (Singapore)**. JSON can't hold a
comment, so the reason lives here: Vercel defaults new projects to `iad1`
(Washington, D.C.), and our Supabase project — both the Postgres database and
the auth API — is in `ap-southeast-1` (Singapore). Left at the default, every
`auth.getUser()` and every Prisma query crossed the Pacific twice, ~250ms a
round trip; a single member-space render serializes about ten of them. Our
users are in Indonesia and our data is in Singapore, so there is nothing on
the US East Coast worth being near.

Don't remove the pin without moving Supabase first. To confirm where functions
are actually running:

```bash
curl -sI https://connecteam-web.vercel.app/ | grep x-vercel-id
```

The header reads `<edge>::<function-region>::<id>` — the middle segment should
be `sin1`.
