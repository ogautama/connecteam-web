import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * For Client Components (e.g. the "Sign in with Google" button). Kept in its
 * own module — separate from createSupabaseServerClient (supabase-server.ts) —
 * so importing it into the client bundle doesn't drag in `next/headers`, which
 * the App Router only permits in Server Components.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
