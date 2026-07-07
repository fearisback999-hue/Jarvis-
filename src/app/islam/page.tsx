"use client";

import { useState } from "react";
import { useJarvis, prayerStreak } from "@/lib/store";
import type { PrayerStatus } from "@/lib/store";
import { computePrayerTimes, nextPrayer, PRAYER_NAMES, type PrayerName } from "@/lib/prayer-times";
import { todayKey, fmtHM, lastNDays } from "@/lib/utils";
import { useMounted, useNow } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Flame, Plus, Trash2 } from "lucide-react";

const STATUS_OPTIONS: { id: PrayerStatus; label: string; cls: string }[] = [
  { id: "jamaah", label: "Jama'ah", cls: "bg-emerald-500/20 text-emerald-300" },
  { id: "on_time", label: "On time", cls: "bg-teal-500/15 text-teal-300" },
  { id: "late", label: "Late", cls: "bg-amber-500/15 text-amber-300" },
  { id: "missed", label: "Missed", cls: "bg-rose-500/15 text-rose-300" },
];

const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

export default function IslamPage() {
  const mounted = useMounted();
  const now = useNow(1000);
  const s = useJarvis();
  const [quranRef, setQuranRef] = useState("");
  const [quranPages, setQuranPages] = useState("");
  const [duaText, setDuaText] = useState("");

  if (!mounted) return null;

  const today = todayKey();
  const times = computePrayerTimes(now, s.profile.latitude, s.profile.longitude, s.profile.method, s.profile.asrMethod);
  const next = nextPrayer(times, now);
  const nextName = next.name.replace("_tomorrow", "") as PrayerName;
  const totalSec = Math.floor(next.minutesUntil * 60);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), sec = totalSec % 60;

  const todayLog = s.prayerLogs[today] ?? {};
  const streak = prayerStreak(s.prayerLogs);

  const week = lastNDays(7);
  const weekPages = s.quranLogs.filter((q) => week.includes(q.date)).reduce((a, q) => a + q.pages, 0);
  const todayDhikr = s.dhikrLogs.filter((d) => d.date === today).reduce((a, d) => a + d.count, 0);

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Islam" subtitle="The anchor of the whole system — everything schedules around the prayers." />

      <Card className="flex flex-col items-center gap-1 bg-gradient-to-b from-teal-500/[0.08] to-transparent py-8">
        <span className="text-[12px] uppercase tracking-widest text-teal-400">Next prayer · {PRAYER_LABEL[nextName]}{next.name.endsWith("tomorrow") ? " (tomorrow)" : ""}</span>
        <span className="tabular text-5xl font-semibold tracking-tight">
          {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
        </span>
        <span className="text-[13px] text-zinc-500">at {fmtHM(next.at)} · {s.profile.method} method</span>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Streak" value={<span className="flex items-center gap-1.5">{streak}d <Flame size={18} className="text-amber-400" /></span>} sub="all 5 prayers, none missed" />
        <StatCard label="Today" value={`${Object.values(todayLog).filter((x) => x !== "missed").length}/5`} sub="prayers logged" accent="#0d9488" />
        <StatCard label="Qur'an this week" value={`${weekPages}p`} />
        <StatCard label="Dhikr today" value={todayDhikr} />
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Today&apos;s prayers</h2>
        <div className="grid gap-2 md:grid-cols-5">
          {PRAYER_NAMES.map((p) => {
            const logged = todayLog[p];
            const passed = times[p] <= now.getHours() * 60 + now.getMinutes();
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-[14px] font-semibold">Qur&apos;an reading</h2>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Surah / Juz" value={quranRef} onChange={(e) => setQuranRef(e.target.value)} />
            <Input className="w-20" type="number" placeholder="pages" value={quranPages} onChange={(e) => setQuranPages(e.target.value)} />
            <Button onClick={() => {
              const p = parseFloat(quranPages);
              if (quranRef.trim() && p) { s.addQuranLog({ date: today, reference: quranRef.trim(), pages: p }); setQuranRef(""); setQuranPages(""); }
            }}><Plus size={13} /></Button>
          </div>
          <ul className="flex flex-col gap-1 text-[13px]">
            {s.quranLogs.slice(0, 6).map((q) => (
              <li key={q.id} className="flex justify-between text-zinc-400">
                <span>{q.reference}</span>
                <span className="tabular text-zinc-600">{q.date.slice(5)} · {q.pages}p</span>
              </li>
            ))}
            {s.quranLogs.length === 0 && <li className="text-[12px] text-zinc-600">The scheduler reserves Qur&apos;an time after Fajr daily.</li>}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-[14px] font-semibold">Dhikr counter</h2>
          <div className="grid grid-cols-3 gap-2">
            {["SubhanAllah", "Alhamdulillah", "Allahu Akbar"].map((kind) => (
              <button
                key={kind}
                onClick={() => s.addDhikr(today, kind, 33)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-4 text-center text-[12px] text-zinc-300 transition-colors hover:border-teal-500/40"
              >
                {kind}
                <div className="mt-1 text-[10px] text-zinc-600">+33</div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-zinc-500">
            <span className="tabular font-semibold text-teal-400">{todayDhikr}</span> today
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-[14px] font-semibold">Personal duas</h2>
          <div className="mb-2 flex gap-2">
            <Input placeholder="Add a dua…" value={duaText} onChange={(e) => setDuaText(e.target.value)} />
            <Button onClick={() => { if (duaText.trim()) { s.addDua(duaText.trim()); setDuaText(""); } }}><Plus size={13} /></Button>
          </div>
          {s.duas.length === 0 ? (
            <EmptyState>Keep your personal duas close.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {s.duas.map((d) => (
                <li key={d.id} className="group flex items-start gap-2 text-[12.5px] italic text-zinc-400">
                  <span className="flex-1">&ldquo;{d.text}&rdquo;</span>
                  <button onClick={() => s.deleteDua(d.id)} className="mt-0.5 text-zinc-800 hover:text-rose-400 group-hover:text-zinc-600" aria-label="Delete dua">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex items-center justify-between text-[13px]">
        <div>
          <span className="font-medium text-teal-300">Ramadan mode</span>
          <span className="ml-2 text-zinc-500">inverts the schedule around suhoor, iftar and taraweeh (full logic lands in Phase 5)</span>
        </div>
        <button
          onClick={() => s.setProfile({ ramadanMode: !s.profile.ramadanMode })}
          className={cn("h-5 w-9 rounded-full transition-colors", s.profile.ramadanMode ? "bg-teal-500" : "bg-zinc-700")}
          aria-label="Toggle Ramadan mode"
        >
          <span className={cn("block h-4 w-4 translate-y-0 rounded-full bg-white transition-transform", s.profile.ramadanMode ? "translate-x-[18px]" : "translate-x-0.5")} />
        </button>
      </Card>
    </div>
  );
}
