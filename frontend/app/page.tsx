"use client";

import { useState, type FormEvent } from "react";
import { Sparkles, Loader2 } from "lucide-react";

const CEO_EMAIL = "ceo@gmail.com";

const EMAIL_TO_CLONE: Record<string, string> = {
  "ella2happy@gmail.com": "Ella Lan",
  "mvideet@gmail.com": "Videet Mehta",
  "angelinaquan2024@gmail.com": "Angelina Quan",
  "jamesliu535b@gmail.com": "James Liu",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    sessionStorage.setItem("orgpulse_email", trimmed);
    sessionStorage.setItem("orgpulse_clone_name", EMAIL_TO_CLONE[trimmed] || "");
    window.location.href = trimmed === CEO_EMAIL ? "/ceo" : "/employee";
  };

  const handleGoogleAuth = () => {
    setLoading(true);
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111113]">
      <div className="w-full max-w-[420px] px-4">
        {/* Card */}
        <div className="rounded-2xl border border-[#2a2a2e] bg-[#19191d] px-8 pb-8 pt-10">
          {/* Logo icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sparkles size={20} />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-1.5 text-center text-[20px] font-semibold text-white">
            Sign in to OrgPulse
          </h1>
          <p className="mb-7 text-center text-[14px] text-[#888]">
            Enter your email to continue.
          </p>

          {/* Email input */}
          <form onSubmit={handleSubmit} className="mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Business email*"
              autoFocus
              className="mb-3 w-full rounded-lg border border-[#2a2a2e] bg-[#111113] px-4 py-3 text-[14px] text-white placeholder:text-[#555] focus:border-[#444] focus:outline-none"
            />
            {error && (
              <p className="mb-2 text-[12px] text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-[14px] font-semibold text-black transition-colors hover:bg-[#e8e8e8] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2a2a2e]" />
            <span className="text-[12px] font-medium text-[#555]">OR</span>
            <div className="h-px flex-1 bg-[#2a2a2e]" />
          </div>

          {/* Google auth */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#2a2a2e] bg-transparent px-4 py-3 text-[14px] font-medium text-[#ccc] transition-colors hover:border-[#444] hover:text-white disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
