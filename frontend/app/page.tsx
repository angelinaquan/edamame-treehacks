"use client";

import { useState, type FormEvent } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[80px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px] px-4">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles size={22} />
          </div>
          <span className="text-[24px] font-semibold tracking-tight text-white">
            OrgPulse
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-7 text-center">
            <h1 className="mb-1.5 text-[19px] font-semibold text-white">
              Sign in to your workspace
            </h1>
            <p className="text-[13.5px] text-white/50">
              Enter your email to continue.
            </p>
          </div>

          {/* Google auth button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] font-medium text-white/90 transition-all hover:bg-white/[0.1] hover:border-white/20 disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[12px] font-medium text-white/30">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="Business email*"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {error && (
                <p className="mt-1.5 text-[12px] text-red-400">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[14px] font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11.5px] text-white/25">
            Your workspace role is determined automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
