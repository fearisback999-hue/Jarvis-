"use client";

import { useJarvis, readinessScore } from "@/lib/store";
import { todayKey, lastNDays } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Input, ProgressBar } from "@/components/ui";
import { TrendLine } from "@/components/charts";

const FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "waterMl", label: "Water", unit: "ml" },
  { key: "sleepHours", label: "Sleep", unit: "h" },
  { key: "weight", label: "Weight", unit: "lbs" },
  { key: "mood", label: "Mood", unit: "/10" },
  { key: "stress", label: "Stress", unit: "/10" },
  { key: "energy", label: "Energy", unit: "/10" },
] as const;

export default function HealthPage() {
  const mounted = useMounted();
  const s = useJarvis();
  if (!mounted) return null;

  const today = todayKey();
  const log = s.health[today] ?? {};
  const readiness = readinessScore(log);

  const days = lastNDays(14);
  const weightTrend = days.map((d) => ({ day: d.slice(5), weight: s.health[d]?.weight ?? null }));
  const sleepTrend = days.map((d) => ({ day: d.slice(5), sleep: s.health[d]?.sleepHours ?? null }));

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Health" subtitle="Fuel, sleep, recovery — the engine behind everything else." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Daily readiness"
          value={readiness ?? "—"}
          accent={readiness == null ? undefined : readiness >= 75 ? "#10b981" : readiness >= 50 ? "#d97706" : "#f43f5e"}
          sub={readiness == null ? "log sleep, mood & energy" : readiness >= 75 ? "green light — push hard" : readiness >= 50 ? "moderate — technique day" : "recover — light work only"}
        />
        <StatCard label="Sleep last night" value={log.sleepHours != null ? `${log.sleepHours}h` : "—"} />
        <StatCard label="Protein today" value={log.protein != null ? `${log.protein}g` : "—"} />
        <StatCard label="Weight" value={log.weight != null ? `${log.weight} lbs` : "—"} />
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Today&apos;s log</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-[12px] text-zinc-500">
              {f.label} <span className="sr-only">{f.unit}</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={log[f.key] ?? ""}
                  placeholder="—"
                  onChange={(e) => s.logHealth(today, { [f.key]: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
                <span className="w-8 text-[11px] text-zinc-600">{f.unit}</span>
              </div>
            </label>
          ))}
        </div>
        {log.waterMl != null && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
              <span>Water</span><span className="tabular">{log.waterMl} / 3000 ml</span>
            </div>
            <ProgressBar value={(log.waterMl / 3000) * 100} color="#0284c7" />
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-[14px] font-semibold">Weight — 14 days</h2>
          <TrendLine data={weightTrend} dataKey="weight" xKey="day" color="#8b5cf6" />
        </Card>
        <Card>
          <h2 className="mb-2 text-[14px] font-semibold">Sleep — 14 days</h2>
          <TrendLine data={sleepTrend} dataKey="sleep" xKey="day" color="#0284c7" />
        </Card>
      </div>
    </div>
  );
}
