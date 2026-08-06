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
          // cookies. Ignorable *only* because proxy.ts refreshes the session
          // site-wide (its matcher is deliberately not scoped to /member/**)
          // and so writes the rotated tokens where they can actually persist.
          // Narrow that matcher and this becomes silent session loss: the
          // render refreshes, Supabase revokes the old refresh token, and the
          // new one dies here — the member is signed out on the next request.
        }
      },
    },
  });
}
