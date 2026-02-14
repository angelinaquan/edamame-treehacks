"use client";

import { Bell, Search } from "lucide-react";
import { getActiveReminders } from "@/lib/mock-data";

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
      className={`flex h-14 items-center justify-between bg-white px-4 dark:bg-zinc-950 ${
        noBorder
          ? ""
          : "border-b border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <Search size={18} />
        </button>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          <Bell size={18} />
          {reminders.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
