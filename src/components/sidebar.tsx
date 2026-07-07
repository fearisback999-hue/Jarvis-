"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Sparkles, Wallet, Receipt, Video, Store, Factory, Swords, Dumbbell,
  HeartPulse, Scale, Moon, CalendarClock, CheckSquare, Settings,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/jarvis", label: "JARVIS", icon: Sparkles },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/money/bills", label: "Bills & Autopay", icon: Receipt },
  { href: "/business/pod", label: "POD Automation", icon: Factory },
  { href: "/business/tiktok", label: "TikTok Shop", icon: Video },
  { href: "/business/etsy", label: "Etsy", icon: Store },
  { href: "/prayer", label: "Prayer", icon: Moon },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/boxing", label: "Boxing", icon: Swords },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/law", label: "Law", icon: Scale },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[210px] flex-col border-r border-white/[0.06] bg-[#0b0b0d] md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-[13px] font-bold text-white">J</span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight">JARVIS</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-600">Personal AI OS</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                active ? "bg-white/[0.06] text-zinc-50" : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-emerald-500" />}
              <Icon size={15} strokeWidth={2} className={active ? "text-emerald-400" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.06] px-4 py-3 text-[11px] text-zinc-600">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Local-first · always on
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV.slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/[0.08] bg-[#0b0b0d]/95 py-2 backdrop-blur md:hidden">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 px-2 text-[10px]", pathname === href ? "text-emerald-400" : "text-zinc-500")}>
          <Icon size={18} />
          {label.split(" ")[0]}
        </Link>
      ))}
    </nav>
  );
}
