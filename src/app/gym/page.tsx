"use client";

import { useNow, useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

// Lifting: every day, no days off. This is a reminder-only page — no
// session logging, no prescribed exercises or programs.
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function GymPage() {
  const mounted = useMounted();
  const now = useNow(60000);

  if (!mounted) return null;

  const todayDow = now.getDay();

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Gym" subtitle="Every day. No days off." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Today" value="Lifting day" accent="#8b5cf6" sub="show up" />
        <StatCard label="Schedule" value="Every day" accent="#8b5cf6" sub="no rest days" />
        <StatCard label="Programming" value="Your call" sub="no prescriptions here" />
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">The week</h2>
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((name, dow) => {
            const isToday = dow === todayDow;
            return (
              <div
                key={name}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border py-4",
                  isToday ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-white/[0.06] bg-white/[0.02]"
                )}
              >
                <span className={cn("text-[12px] font-medium", isToday ? "text-emerald-300" : "text-zinc-400")}>
                  {name.slice(0, 3)}
                </span>
                <span className="rounded-md bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-400">
                  Lift
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
