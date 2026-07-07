"use client";

import { useState } from "react";
import { useJarvis } from "@/lib/store";
import type { WorkoutSet } from "@/lib/store";
import { todayKey, lastNDays } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, EmptyState } from "@/components/ui";
import { MiniBars } from "@/components/charts";
import { Plus, Trash2 } from "lucide-react";

interface DraftSet { exercise: string; muscleGroup: string; reps: string; weight: string }

export default function GymPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [name, setName] = useState("");
  const [sets, setSets] = useState<DraftSet[]>([{ exercise: "", muscleGroup: "", reps: "", weight: "" }]);

  if (!mounted) return null;

  const week = lastNDays(7);
  const weekWorkouts = s.workouts.filter((w) => week.includes(w.date));
  const weekSets = weekWorkouts.reduce((a, w) => a + w.sets.length, 0);
  const weekTonnage = weekWorkouts.reduce((a, w) => a + w.sets.reduce((x, st) => x + st.reps * st.weight, 0), 0);

  // PRs: best weight per exercise
  const prs = new Map<string, number>();
  for (const w of s.workouts) for (const st of w.sets) {
    const key = st.exercise.toLowerCase();
    if ((prs.get(key) ?? 0) < st.weight) prs.set(key, st.weight);
  }

  const volumeByDay = week.map((d) => ({
    day: d.slice(5),
    sets: s.workouts.filter((w) => w.date === d).reduce((a, w) => a + w.sets.length, 0),
  }));

  const saveWorkout = () => {
    const valid = sets
      .filter((x) => x.exercise.trim() && x.reps && x.weight)
      .map((x) => ({
        exercise: x.exercise.trim(),
        muscleGroup: x.muscleGroup.trim() || "other",
        reps: parseInt(x.reps),
        weight: parseFloat(x.weight),
      })) as WorkoutSet[];
    if (!valid.length) return;
    s.addWorkout({ date: todayKey(), name: name.trim() || "Workout", sets: valid });
    setName("");
    setSets([{ exercise: "", muscleGroup: "", reps: "", weight: "" }]);
  };

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Gym" subtitle="Progressive overload, tracked to the pound." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sets this week" value={weekSets} accent="#8b5cf6" />
        <StatCard label="Tonnage this week" value={`${Math.round(weekTonnage).toLocaleString()} lbs`} />
        <StatCard label="Workouts logged" value={s.workouts.length} />
        <StatCard label="Exercises with PRs" value={prs.size} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-[14px] font-semibold">Log workout</h2>
          <Input className="mb-2" placeholder="Workout name (e.g. Push day)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            {sets.map((st, i) => (
              <div key={i} className="flex gap-1.5">
                <Input placeholder="Exercise" value={st.exercise} onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, exercise: e.target.value } : x)))} />
                <Input className="w-24" placeholder="Muscle" value={st.muscleGroup} onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, muscleGroup: e.target.value } : x)))} />
                <Input className="w-16" type="number" placeholder="Reps" value={st.reps} onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))} />
                <Input className="w-20" type="number" placeholder="lbs" value={st.weight} onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} />
                <button onClick={() => setSets(sets.filter((_, j) => j !== i))} className="px-1 text-zinc-700 hover:text-rose-400" aria-label="Remove set">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" onClick={() => setSets([...sets, { exercise: sets.at(-1)?.exercise ?? "", muscleGroup: sets.at(-1)?.muscleGroup ?? "", reps: "", weight: "" }])}>
              <Plus size={13} /> Set
            </Button>
            <Button onClick={saveWorkout}>Save workout</Button>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-[14px] font-semibold">Sets per day — last 7 days</h2>
            <MiniBars data={volumeByDay} dataKey="sets" xKey="day" color="#8b5cf6" />
          </Card>
          <Card>
            <h2 className="mb-2 text-[14px] font-semibold">Personal records</h2>
            {prs.size === 0 ? (
              <EmptyState>PRs appear automatically as you log heavier lifts.</EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-1.5 text-[13px]">
                {[...prs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ex, wt]) => (
                  <li key={ex} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                    <span className="truncate capitalize">{ex}</span>
                    <span className="tabular font-semibold text-violet-400">{wt} lbs</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">History</h2>
        {s.workouts.length === 0 ? (
          <EmptyState>No workouts yet. Tell JARVIS: &quot;log push day — bench 3x8 at 155&quot;.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {s.workouts.slice(0, 10).map((w) => (
              <li key={w.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">{w.name}</span>
                  <span className="tabular text-zinc-500">{w.date}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-zinc-500">
                  {w.sets.map((st, i) => (
                    <span key={i}>{st.exercise} {st.reps}×{st.weight}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
