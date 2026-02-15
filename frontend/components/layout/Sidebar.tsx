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
    <aside className="flex h-full w-16 flex-col items-center border-r border-[#1e1e22] bg-[#111114] py-4 lg:w-56 lg:items-stretch lg:px-3">
      {/* Logo */}
      <Link
        href="/"
        className="mb-6 flex items-center justify-center gap-2 lg:justify-start lg:px-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c4b5a0] text-[#0a0a0c]">
          <Sparkles size={16} />
        </div>
        <span className="hidden text-sm font-bold text-[#ededed] lg:block">
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
                  ? "bg-[#1e1e22] text-[#ededed]"
                  : "text-[#a1a1aa] hover:bg-[#19191d] hover:text-[#d4d4d8]"
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
        className="flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#a1a1aa] transition-colors hover:bg-[#19191d] hover:text-[#d4d4d8] lg:justify-start"
      >
        <Settings size={18} />
        <span className="hidden lg:block">Settings</span>
      </Link>
    </aside>
  );
}
