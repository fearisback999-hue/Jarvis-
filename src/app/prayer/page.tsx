"use client";

import { useJarvis, prayerStreak } from "@/lib/store";
import type { PrayerStatus } from "@/lib/store";
import { computePrayerTimes, nextPrayer, PRAYER_NAMES, type PrayerName } from "@/lib/prayer-times";
import { todayKey, fmtHM } from "@/lib/utils";
import { useMounted, useNow } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

const STATUS_OPTIONS: { id: PrayerStatus; label: string; cls: string }[] = [
  { id: "jamaah", label: "Jama'ah", cls: "bg-emerald-500/20 text-emerald-300" },
  { id: "on_time", label: "On time", cls: "bg-teal-500/15 text-teal-300" },
  { id: "late", label: "Late", cls: "bg-amber-500/15 text-amber-300" },
  { id: "missed", label: "Missed", cls: "bg-rose-500/15 text-rose-300" },
];

const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

export default function PrayerPage() {
  const mounted = useMounted();
  const now = useNow(1000);
  const s = useJarvis();
  if (!mounted) return null;

  const today = todayKey();
  const times = computePrayerTimes(now, s.profile.latitude, s.profile.longitude, s.profile.method, s.profile.asrMethod);
  const next = nextPrayer(times, now);
  const nextName = next.name.replace("_tomorrow", "") as PrayerName;
  const totalSec = Math.floor(next.minutesUntil * 60);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), sec = totalSec % 60;

  const todayLog = s.prayerLogs[today] ?? {};
  const streak = prayerStreak(s.prayerLogs);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Prayer" subtitle="The five anchors — everything else schedules around them." />

      <Card className="flex flex-col items-center gap-1 bg-gradient-to-b from-teal-500/[0.08] to-transparent py-8">
        <span className="text-[12px] uppercase tracking-widest text-teal-400">
          Next prayer · {PRAYER_LABEL[nextName]}{next.name.endsWith("tomorrow") ? " (tomorrow)" : ""}
        </span>
        <span className="tabular text-5xl font-semibold tracking-tight">
          {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
        </span>
        <span className="text-[13px] text-zinc-500">at {fmtHM(next.at)} · {s.profile.method} method</span>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Streak"
          value={<span className="flex items-center gap-1.5">{streak}d <Flame size={18} className="text-amber-400" /></span>}
          sub="all 5 prayers, none missed"
        />
        <StatCard label="Today" value={`${Object.values(todayLog).filter((x) => x !== "missed").length}/5`} sub="prayers logged" accent="#0d9488" />
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Today&apos;s prayers</h2>
        <div className="grid gap-2 md:grid-cols-5">
          {PRAYER_NAMES.map((p) => {
            const logged = todayLog[p];
            const passed = times[p] <= nowMin;
            return (
              <div key={p} className={cn("rounded-xl border p-3", logged ? "border-teal-500/30 bg-teal-500/[0.05]" : "border-white/[0.06] bg-white/[0.02]")}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium">{PRAYER_LABEL[p]}</span>
                  <span className="tabular text-[12px] text-zinc-500">{fmtHM(times[p])}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => s.logPrayer(today, p, opt.id)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium transition-all",
                        logged === opt.id ? opt.cls : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300",
                        !passed && !logged && "opacity-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
