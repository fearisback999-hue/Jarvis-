"use client";

import { useState } from "react";
import { useJarvis, BOXING_SKILLS } from "@/lib/store";
import type { BoxingType, BoxingSkill } from "@/lib/store";
import { todayKey, lastNDays } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, EmptyState } from "@/components/ui";
import { SkillRadar, MiniBars } from "@/components/charts";

const TYPES: BoxingType[] = ["bag", "pads", "sparring", "conditioning", "roadwork", "technique", "defense"];

export default function BoxingPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [type, setType] = useState<BoxingType>("bag");
  const [minutes, setMinutes] = useState("30");
  const [intensity, setIntensity] = useState("7");
  const [fightDate, setFightDate] = useState(s.fightDate ?? "");
  const [targetWeight, setTargetWeight] = useState(s.targetWeight?.toString() ?? "");

  if (!mounted) return null;

  const week = lastNDays(7);
  const weekSessions = s.boxingSessions.filter((b) => week.includes(b.date));
  const weekMinutes = weekSessions.reduce((a, b) => a + b.minutes, 0);
  const radarData = BOXING_SKILLS.map((skill) => ({ skill, rating: s.skills[skill] }));

  const volumeByDay = week.map((d) => ({
    day: d.slice(5),
    minutes: s.boxingSessions.filter((b) => b.date === d).reduce((a, b) => a + b.minutes, 0),
  }));

  const daysToFight = s.fightDate
    ? Math.ceil((new Date(s.fightDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Boxing" subtitle="Train like the fight is booked." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="This week" value={`${weekMinutes}m`} sub={`${weekSessions.length} sessions`} accent="#f43f5e" />
        <StatCard label="Sparring rounds (wk)" value={weekSessions.filter((x) => x.type === "sparring").reduce((a, x) => a + (x.rounds ?? 0), 0)} />
        <StatCard label="Total sessions" value={s.boxingSessions.length} />
        <StatCard label={daysToFight != null ? "Fight countdown" : "Fight prep"} value={daysToFight != null ? `${daysToFight}d` : "—"} sub={s.targetWeight ? `target ${s.targetWeight} lbs` : "set a fight date"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-[14px] font-semibold">Skill matrix</h2>
          <p className="mb-2 text-[12px] text-zinc-500">Rate yourself honestly — JARVIS plans sessions around the gaps.</p>
          <SkillRadar data={radarData} />
          <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5">
            {BOXING_SKILLS.map((skill) => (
              <label key={skill} className="flex items-center justify-between gap-1 text-[11px] text-zinc-500">
                <span className="capitalize">{skill}</span>
                <input
                  type="number" min={0} max={10}
                  value={s.skills[skill]}
                  onChange={(e) => s.setSkill(skill as BoxingSkill, Math.min(10, Math.max(0, Number(e.target.value))))}
                  className="tabular w-11 rounded border border-white/[0.08] bg-[#0d0d0f] px-1 py-0.5 text-center text-zinc-200"
                />
              </label>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-3 text-[14px] font-semibold">Log session</h2>
            <div className="flex flex-wrap gap-2">
              <Select value={type} onChange={(e) => setType(e.target.value as BoxingType)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input className="w-24" type="number" placeholder="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <Input className="w-24" type="number" placeholder="RPE 1-10" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
              <Button onClick={() => {
                const m = parseInt(minutes); if (!m) return;
                s.addBoxingSession({ date: todayKey(), type, minutes: m, intensity: Math.min(10, parseInt(intensity) || 6) });
              }}>Log</Button>
            </div>
          </Card>
          <Card>
            <h2 className="mb-2 text-[14px] font-semibold">Volume — last 7 days</h2>
            <MiniBars data={volumeByDay} dataKey="minutes" xKey="day" color="#f43f5e" />
          </Card>
          <Card>
            <h2 className="mb-3 text-[14px] font-semibold">Fight prep</h2>
            <div className="flex flex-wrap gap-2">
              <Input className="w-40" type="date" value={fightDate} onChange={(e) => setFightDate(e.target.value)} />
              <Input className="w-32" type="number" placeholder="Target lbs" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
              <Button variant="ghost" onClick={() => s.setFightPrep(fightDate || undefined, targetWeight ? parseFloat(targetWeight) : undefined)}>Save</Button>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Session log</h2>
        {s.boxingSessions.length === 0 ? (
          <EmptyState>No sessions logged. Tell JARVIS: &quot;log 45 minutes of pads, intensity 8&quot;.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {s.boxingSessions.slice(0, 15).map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <span className="tabular w-20 text-zinc-500">{b.date.slice(5)}</span>
                <span className="w-28 capitalize">{b.type}</span>
                <span className="tabular text-zinc-400">{b.minutes}m</span>
                {b.rounds != null && <span className="tabular text-zinc-500">{b.rounds} rds</span>}
                <span className="tabular text-[12px] text-rose-400">RPE {b.intensity}</span>
                {b.notes && <span className="truncate text-[12px] text-zinc-600">{b.notes}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
