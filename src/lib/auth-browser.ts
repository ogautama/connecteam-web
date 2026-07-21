import { createSupabaseBrowserClient } from "@/lib/supabase";

/**
 * Browser-only auth actions (used by Client Components like the /login "Sign
 * in with Google" button). Kept out of auth.ts so a Client Component can
 * import them without pulling in that module's server-only dependencies
 * (Prisma, `next/headers`). auth.ts re-exports these for server-side callers.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
}
