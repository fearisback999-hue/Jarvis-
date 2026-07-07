"use client";

import { useState } from "react";
import { useJarvis } from "@/lib/store";
import { useMounted, useNow } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

// Boxing days: Monday, Tuesday, Wednesday, Friday, Saturday. He shows up —
// no session logging, no coaching, no telling him what to hit.
const BOXING_DAYS = new Set([1, 2, 3, 5, 6]);
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BoxingPage() {
  const mounted = useMounted();
  const now = useNow(60000);
  const s = useJarvis();
  const [fightDate, setFightDate] = useState(s.fightDate ?? "");
  const [targetWeight, setTargetWeight] = useState(s.targetWeight?.toString() ?? "");

  if (!mounted) return null;

  const todayDow = now.getDay();
  const isBoxingToday = BOXING_DAYS.has(todayDow);
  let nextBoxing = 1;
  while (!BOXING_DAYS.has((todayDow + nextBoxing) % 7)) nextBoxing++;

  const daysToFight = s.fightDate
    ? Math.ceil((new Date(s.fightDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Boxing" subtitle="Mon · Tue · Wed · Fri · Sat. Just be there." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Today"
          value={isBoxingToday ? "Boxing day" : "Rest day"}
          accent={isBoxingToday ? "#f43f5e" : undefined}
          sub={isBoxingToday ? "show up" : `next: ${DAY_NAMES[(todayDow + nextBoxing) % 7]}`}
        />
        <StatCard label="Lifting" value="Every day" accent="#8b5cf6" sub="no days off" />
        <StatCard
          label={daysToFight != null ? "Fight countdown" : "Fight prep"}
          value={daysToFight != null ? `${daysToFight}d` : "—"}
          sub={s.targetWeight ? `target ${s.targetWeight} lbs` : "set a date when booked"}
        />
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">The week</h2>
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((name, dow) => {
            const boxing = BOXING_DAYS.has(dow);
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
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", boxing ? "bg-rose-500/15 text-rose-400" : "bg-zinc-800/70 text-zinc-600")}>
                  {boxing ? "Boxing" : "—"}
                </span>
                <span className="rounded-md bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-400">
                  Lift
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Fight prep</h2>
        <div className="flex flex-wrap gap-2">
          <Input className="w-40" type="date" value={fightDate} onChange={(e) => setFightDate(e.target.value)} />
          <Input className="w-32" type="number" placeholder="Target lbs" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
          <Button variant="ghost" onClick={() => s.setFightPrep(fightDate || undefined, targetWeight ? parseFloat(targetWeight) : undefined)}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
