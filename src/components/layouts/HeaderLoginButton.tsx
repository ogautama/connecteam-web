"use client";

import { signInWithGoogle } from "@/lib/auth-browser";

// Header "Login" — kicks off Google sign-in directly instead of routing to
// /login first (one less click). /login still exists as a standalone page
// (e.g. the no-profile redirect target), it's just not this button's job.
export default function HeaderLoginButton() {
  return (
    <button
      type="button"
      onClick={() => signInWithGoogle()}
      className="rounded-full bg-brand-navy-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navy-800"
    >
      Login
    </button>
  );
}
