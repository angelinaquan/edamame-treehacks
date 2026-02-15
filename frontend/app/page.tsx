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

    // Store email for the session
    sessionStorage.setItem("orgpulse_email", trimmed);
    sessionStorage.setItem("orgpulse_clone_name", EMAIL_TO_CLONE[trimmed] || "");

    if (trimmed === CEO_EMAIL) {
      window.location.href = "/ceo";
    } else {
      window.location.href = "/employee";
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles size={20} />
          </div>
          <span className="text-[22px] font-semibold tracking-tight text-neutral-900">
            OrgPulse
          </span>
        </div>

        {/* Form */}
        <div className="mb-8 text-center">
          <h1 className="mb-1.5 text-[18px] font-semibold text-neutral-900">
            Sign in
          </h1>
          <p className="text-[13.5px] text-neutral-500">
            Enter your email to continue to your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="you@company.com"
              autoFocus
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {error && (
              <p className="mt-1.5 text-[12px] text-red-500">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
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

        <p className="mt-6 text-center text-[12px] text-neutral-400">
          Your role is determined automatically by your email.
        </p>
      </div>
    </div>
  );
}
