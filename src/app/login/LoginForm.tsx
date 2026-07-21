"use client";

import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/lib/auth-browser";

// Rendered inline (not a redirect to /not-invited) when the sign-in flow
// sends the user back to /login?reason=not-invited — a valid Google session
// whose email no leader ever invited (see Plan 02b's pending-invite gate).
function NotInvitedNotice() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-brand-yellow-300 bg-brand-yellow-50 p-6 text-center">
      <h2 className="text-lg font-semibold text-ink-900">
        Kamu belum ditambahkan
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Akun Google kamu berhasil masuk, tapi belum ada leader yang menambahkan
        email kamu ke CONNECTeam. Minta leader kamu buat nambahin, lalu masuk
        lagi.
      </p>
    </div>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const notInvited = searchParams.get("reason") === "not-invited";

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {notInvited && <NotInvitedNotice />}

      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="flex items-center gap-3 rounded-full border border-ink-100 bg-white px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"
      >
        <GoogleIcon />
        Sign in with Google
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z"
      />
    </svg>
  );
}
