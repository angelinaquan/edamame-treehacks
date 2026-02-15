"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/", icon: MessageSquare, label: "Chat" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clones", icon: Users, label: "Clones" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:w-56 lg:items-stretch lg:px-3">
      {/* Logo */}
      <Link
        href="/"
        className="mb-6 flex items-center justify-center gap-2 lg:justify-start lg:px-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white">
          <Sparkles size={16} />
        </div>
        <span className="hidden text-sm font-bold text-zinc-900 dark:text-zinc-100 lg:block">
          Digital Twin
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <Icon size={18} />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <Link
        href="/settings"
        className="flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 lg:justify-start"
      >
        <Settings size={18} />
        <span className="hidden lg:block">Settings</span>
      </Link>
    </aside>
  );
}
