"use client";

import { Sparkles, Users, Crown } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Sparkles size={22} />
        </div>
        <span className="text-[24px] font-semibold tracking-tight text-neutral-900">
          OrgPulse
        </span>
      </div>

      <h1 className="mb-2 text-[20px] font-semibold text-neutral-900">
        Welcome back
      </h1>
      <p className="mb-10 text-[14px] text-neutral-500">
        Choose your portal to get started.
      </p>

      <div className="flex gap-5">
        {/* Employee Portal */}
        <a
          href="/employee"
          className="group flex w-[260px] flex-col items-center rounded-2xl border border-neutral-200 bg-white p-8 text-center transition-all hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
            <Users size={28} />
          </div>
          <h2 className="mb-1.5 text-[16px] font-semibold text-neutral-900">
            Employee
          </h2>
          <p className="text-[13px] leading-relaxed text-neutral-500">
            Chat with your AI twin via text or voice. Manage your knowledge base.
          </p>
        </a>

        {/* CEO Portal */}
        <a
          href="/ceo"
          className="group flex w-[260px] flex-col items-center rounded-2xl border border-neutral-200 bg-white p-8 text-center transition-all hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
            <Crown size={28} />
          </div>
          <h2 className="mb-1.5 text-[16px] font-semibold text-neutral-900">
            CEO / Manager
          </h2>
          <p className="text-[13px] leading-relaxed text-neutral-500">
            Query your organization. Get population-level insights from all employee twins.
          </p>
        </a>
      </div>
    </div>
  );
}
