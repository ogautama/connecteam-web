import { createSupabaseBrowserClient } from "@/lib/supabase";

/**
 * Browser-only auth actions (used by Client Components like the /login "Sign
 * in with Google" button). Kept out of auth.ts so a Client Component can
 * import them without pulling in that module's server-only dependencies
 * (Prisma, `next/headers`). auth.ts re-exports these for server-side callers.
 */
/**
 * `next` is an optional post-login destination, forwarded to /auth/callback,
 * which validates it (same-origin paths only) before redirecting there
 * instead of the default /member.
 */
export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const callback = new URL("/auth/callback", window.location.origin);
  if (next) callback.searchParams.set("next", next);
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
}
