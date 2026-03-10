"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

const CEO_EMAIL = "ceo@gmail.com";

const EMAIL_TO_CLONE: Record<string, string> = {
  "ella2happy@gmail.com": "Ella Lan",
  "mvideet@gmail.com": "Videet Mehta",
  "angelinaquan2024@gmail.com": "Angelina Quan",
  "jamesliu535b@gmail.com": "James Liu",
};

function AuthCompleteContent() {
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").toLowerCase();

  useEffect(() => {
    if (!email) {
      window.location.href = "/";
      return;
    }

    sessionStorage.setItem("edamame_email", email);
    sessionStorage.setItem("edamame_clone_name", EMAIL_TO_CLONE[email] || "");

    // Short delay so the user sees the loading state
    const timer = setTimeout(() => {
      window.location.href = email === CEO_EMAIL ? "/ceo" : "/employee";
    }, 800);

    return () => clearTimeout(timer);
  }, [email]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles size={22} />
          </div>
          <span className="text-[24px] font-semibold tracking-tight text-white">
            Edamame
          </span>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[14px]">Signing you in{email ? ` as ${email}` : ""}…</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
