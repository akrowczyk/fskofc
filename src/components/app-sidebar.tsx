"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  Home,
  Mail,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/members", label: "Members", icon: Users },
  { href: "/retention", label: "Retention", icon: ShieldAlert },
  { href: "/correspondence", label: "Correspondence", icon: Mail },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/audit", label: "Audit prep", icon: ClipboardCheck },
  { href: "/compensation", label: "Compensation", icon: DollarSign },
  { href: "/chat", label: "Assistant", icon: MessageSquare },
  { href: "/governance", label: "Governance", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-5">
        <p className="text-xs font-medium tracking-wide text-sidebar-primary uppercase">
          Council 10325
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">
          FS Companion
        </h1>
        <p className="mt-0.5 text-xs text-white/70">Holy Ghost · Wood Dale</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-white font-medium"
                  : "text-white/80 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-[11px] leading-snug text-white/50">
        Mirror only — verify against kofc.org. Not a system of record.
      </div>
    </aside>
  );
}
