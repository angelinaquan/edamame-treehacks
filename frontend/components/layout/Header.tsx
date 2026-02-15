"use client";

import { Bell, Search } from "lucide-react";
import { getActiveReminders } from "@/lib/memory/mock-data";

interface HeaderProps {
  title?: string;
  noBorder?: boolean;
}

export function Header({
  title = "Digital Twin",
  noBorder = false,
}: HeaderProps) {
  const reminders = getActiveReminders();

  return (
    <header
      className={`flex h-14 items-center justify-between bg-[#0e0e11] px-4 ${
        noBorder
          ? ""
          : "border-b border-[#1e1e22]"
      }`}
    >
      <h1 className="text-lg font-semibold text-[#ededed]">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717a] transition-colors hover:bg-[#1e1e22] hover:text-[#d4d4d8]">
          <Search size={18} />
        </button>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#71717a] transition-colors hover:bg-[#1e1e22] hover:text-[#d4d4d8]">
          <Bell size={18} />
          {reminders.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ef4444]" />
          )}
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c4b5a0] text-xs font-bold text-[#0a0a0c]">
          A
        </div>
      </div>
    </header>
  );
}
