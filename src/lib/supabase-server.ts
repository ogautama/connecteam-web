import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * For Server Components, Server Functions, and Route Handlers — reads/writes
 * the session cookie via `next/headers`. Not usable from Client Components
 * (that's createSupabaseBrowserClient in supabase.ts) nor from proxy.ts, which
 * runs outside that request context and manages its own cookie plumbing
 * directly against the NextRequest/NextResponse pair.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called during a Server Component render, which can't set
          // cookies — safe to ignore since proxy.ts's session refresh on
          // every /member/** request keeps the cookie current regardless.
        }
      },
    },
  });
}
