"use client";

import { useState } from "react";
import { useJarvis } from "@/lib/store";
import type { LawPhase, LawMilestone } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, ProgressBar, Badge } from "@/components/ui";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";

const PHASES: { id: LawPhase; label: string }[] = [
  { id: "high_school", label: "High School" },
  { id: "college", label: "College" },
  { id: "lsat", label: "LSAT" },
  { id: "applications", label: "Applications" },
  { id: "law_school", label: "Law School" },
  { id: "bar", label: "The Bar" },
];

const STATUS_ICON = {
  done: <CheckCircle2 size={15} className="text-emerald-400" />,
  active: <CircleDot size={15} className="text-amber-400" />,
  upcoming: <Circle size={15} className="text-zinc-700" />,
};

export default function LawPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<LawPhase>("high_school");

  if (!mounted) return null;

  const done = s.lawMilestones.filter((m) => m.status === "done").length;
  const active = s.lawMilestones.filter((m) => m.status === "active");
  const progress = s.lawMilestones.length ? (done / s.lawMilestones.length) * 100 : 0;

  const cycle = (m: LawMilestone) => {
    const nextStatus = m.status === "upcoming" ? "active" : m.status === "active" ? "done" : "upcoming";
    s.updateMilestone(m.id, { status: nextStatus });
  };

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Law Roadmap" subtitle="From high school to the bar — one milestone at a time." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Milestones done" value={`${done}/${s.lawMilestones.length}`} accent="#d97706" />
        <StatCard label="Active now" value={active.length} sub={active[0]?.title ?? ""} />
        <StatCard label="Journey progress" value={`${Math.round(progress)}%`} />
      </div>

      <Card>
        <ProgressBar value={progress} color="#d97706" />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PHASES.map((ph) => {
          const items = s.lawMilestones.filter((m) => m.phase === ph.id);
          const phDone = items.filter((m) => m.status === "done").length;
          return (
            <Card key={ph.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold">{ph.label}</h2>
                <Badge className="bg-amber-500/15 text-amber-400">{phDone}/{items.length}</Badge>
              </div>
              <ul className="flex flex-col gap-1.5">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => cycle(m)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.04]"
                      title="Click to cycle: upcoming → active → done"
                    >
                      {STATUS_ICON[m.status]}
                      <span className={m.status === "done" ? "text-zinc-600 line-through" : "text-zinc-200"}>{m.title}</span>
                    </button>
                  </li>
                ))}
                {items.length === 0 && <li className="px-2 py-1 text-[12px] text-zinc-600">No milestones yet for this phase.</li>}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Add milestone</h2>
        <div className="flex flex-wrap gap-2">
          <Input className="flex-1" placeholder="e.g. Join the debate team" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={phase} onChange={(e) => setPhase(e.target.value as LawPhase)}>
            {PHASES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          <Button onClick={() => { if (title.trim()) { s.addMilestone({ phase, title: title.trim(), status: "upcoming" }); setTitle(""); } }}>Add</Button>
        </div>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/[0.04] text-[13px] text-zinc-400">
        <span className="font-medium text-amber-300">Daily habit:</span> the scheduler reserves an LSAT/reading block every day —
        consistent reps beat cramming. Ask JARVIS for &quot;a reading list for future lawyers&quot; anytime.
      </Card>
    </div>
  );
}
