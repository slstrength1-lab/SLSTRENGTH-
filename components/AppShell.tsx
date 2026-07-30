"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  ClipboardCheck,
  TrendingUp,
  MessageSquare,
  Users,
  UserPlus,
  Inbox,
  Menu,
  X,
  ArrowLeftRight,
  Bell,
  Search,
} from "lucide-react";
import { Brand } from "./Brand";
import { Avatar } from "./primitives";

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: string;
};

const ICONS = {
  dashboard: LayoutDashboard,
  training: Dumbbell,
  nutrition: Utensils,
  checkins: ClipboardCheck,
  progress: TrendingUp,
  messages: MessageSquare,
  clients: Users,
  leads: UserPlus,
  approvals: Inbox,
} as const;

export const CLIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/training", label: "Training", icon: "training" },
  { href: "/nutrition", label: "Nutrition", icon: "nutrition" },
  { href: "/checkins", label: "Check-ins", icon: "checkins" },
  { href: "/progress", label: "Progress", icon: "progress" },
  { href: "/messages", label: "Messages", icon: "messages", badge: "1" },
];

export const COACH_NAV: NavItem[] = [
  { href: "/coach", label: "Overview", icon: "dashboard" },
  { href: "/coach/clients", label: "Clients", icon: "clients" },
  { href: "/coach/leads", label: "Leads", icon: "leads" },
  { href: "/coach/approvals", label: "Approvals", icon: "approvals" },
];

export type ShellUser = { name: string; initials: string; sub: string };

export function AppShell({
  role,
  nav,
  user,
  children,
}: {
  role: "client" | "coach";
  nav: NavItem[];
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const switchTo = role === "client" ? "/coach" : "/dashboard";
  const switchLabel = role === "client" ? "Coach view" : "Client view";

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand href={role === "client" ? "/dashboard" : "/coach"} />
      </div>

      <div className="px-3">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          {role === "client" ? "My Coaching" : "Coach Dashboard"}
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/coach" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blood-500 px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-3 p-3">
        <Link
          href={switchTo}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-850/60 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-blood-500/40 hover:text-white"
        >
          <ArrowLeftRight className="h-[18px] w-[18px] text-blood-500" />
          Switch to {switchLabel}
        </Link>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-850/60 px-3 py-2.5">
          <Avatar initials={user.initials} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{user.name}</div>
            <div className="truncate text-xs text-zinc-500">{user.sub}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] bg-ink-900/60 backdrop-blur lg:block">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/[0.06] bg-ink-900">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-ink-900/60 px-3 py-2 text-sm text-zinc-500 sm:flex">
              <Search className="h-4 w-4" />
              <span className="pr-8">Search clients, programs…</span>
              <span className="kbd">⌘K</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/25 sm:inline">
                {role === "client" ? "Active plan" : "Live"}
              </span>
              <button className="relative grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blood-500" />
              </button>
              <div className="lg:hidden">
                <Avatar initials={user.initials} size="sm" />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
