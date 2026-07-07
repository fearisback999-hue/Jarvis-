"use client";

import { useState } from "react";
import { useJarvis } from "@/lib/store";
import type { ClassStatus, TransferClass } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, StatCard, SectionHeader, Button, Input, Select, ProgressBar, Badge } from "@/components/ui";
import { TrendLine } from "@/components/charts";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, CircleDot, ExternalLink, GraduationCap, Scale, Landmark } from "lucide-react";

const STATUS_ICON: Record<ClassStatus, React.ReactNode> = {
  done: <CheckCircle2 size={15} className="text-emerald-400" />,
  in_progress: <CircleDot size={15} className="text-amber-400" />,
  planned: <Circle size={15} className="text-zinc-700" />,
};

const ROUTE_STEPS = [
  { title: "Cypress College", desc: "1.5–2 years · knock out the ASSIST class list below with a 3.9+ GPA", icon: GraduationCap },
  { title: "Transfer via ASSIST", desc: "UC Berkeley or UC Davis · CS or EE (TAG is available for Davis — guaranteed admission)", icon: ExternalLink },
  { title: "CS / EE degree", desc: "The technical degree is what qualifies you for the USPTO patent bar later", icon: CircleDot },
  { title: "LSAT 175–180", desc: "Timed practice tests, logged below — median at Harvard ≈173, Yale ≈175", icon: Scale },
  { title: "Harvard / Yale Law → Patent attorney", desc: "JD + patent bar = one of the highest-paid, most defensible legal niches", icon: Landmark },
];

export default function CareerPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [newClass, setNewClass] = useState({ name: "", course: "" });
  const [lsatInput, setLsatInput] = useState("");

  if (!mounted) return null;

  const c = s.career;
  const majorKey = c.major === "Computer Science" ? "CS" : "EE";
  const relevant = c.classes.filter((x) => x.appliesTo === "Both" || x.appliesTo === "GE" || x.appliesTo === majorKey);
  const done = relevant.filter((x) => x.status === "done").length;
  const progress = relevant.length ? (done / relevant.length) * 100 : 0;

  const best = c.lsatScores.length ? Math.max(...c.lsatScores.map((x) => x.score)) : null;
  const latest = c.lsatScores.at(-1)?.score ?? null;
  const lsatTrend = c.lsatScores.map((x) => ({ day: x.date.slice(5), score: x.score }));

  const cycle = (cls: TransferClass) => {
    const next: ClassStatus = cls.status === "planned" ? "in_progress" : cls.status === "in_progress" ? "done" : "planned";
    s.updateClass(cls.id, next);
  };

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader
        title="Career — Patent Law Route"
        subtitle="Cypress College → UC (ASSIST transfer) → CS/EE degree → LSAT 175+ → Harvard/Yale Law → patent attorney."
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-5">
          {ROUTE_STEPS.map((step, i) => (
            <div key={i} className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <step.icon size={16} className="mb-2 text-amber-400" />
              <div className="text-[13px] font-semibold">{step.title}</div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">{step.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Transfer classes" value={`${done}/${relevant.length}`} accent="#d97706" sub={`for ${c.major} @ ${c.targetUC}`} />
        <StatCard label="GPA" value={c.gpa ?? "—"} sub="aim 3.9+ for Berkeley CS" />
        <StatCard label="Best LSAT practice" value={best ?? "—"} accent={best != null && best >= c.lsatTarget ? "#10b981" : undefined} sub={`target ${c.lsatTarget}+ (180 ceiling)`} />
        <StatCard label="Latest LSAT" value={latest ?? "—"} sub={`${c.lsatScores.length} practice tests logged`} />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold">ASSIST transfer tracker</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={c.targetUC} onChange={(e) => s.setCareer({ targetUC: e.target.value as typeof c.targetUC })}>
              <option>UC Berkeley</option>
              <option>UC Davis</option>
            </Select>
            <Select value={c.major} onChange={(e) => s.setCareer({ major: e.target.value as typeof c.major })}>
              <option>Computer Science</option>
              <option>Electrical Engineering</option>
            </Select>
            <Input
              className="w-20"
              type="number" step="0.01" min="0" max="4" placeholder="GPA"
              value={c.gpa ?? ""}
              onChange={(e) => s.setCareer({ gpa: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
            />
            <a
              href="https://assist.org"
              target="_blank" rel="noopener"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[12px] text-zinc-300 hover:bg-white/[0.04]"
            >
              Open ASSIST <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <ProgressBar value={progress} color="#d97706" />

        <ul className="mt-3 flex flex-col gap-1">
          {relevant.map((cls) => (
            <li key={cls.id}>
              <button
                onClick={() => cycle(cls)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.04]"
                title="Click to cycle: planned → in progress → done"
              >
                {STATUS_ICON[cls.status]}
                <span className={cn("min-w-0 flex-1", cls.status === "done" ? "text-zinc-600 line-through" : "text-zinc-200")}>
                  {cls.name}
                </span>
                <span className="tabular text-[11.5px] text-zinc-500">{cls.cypressCourse}</span>
                <Badge className={
                  cls.appliesTo === "Both" ? "bg-amber-500/15 text-amber-400"
                  : cls.appliesTo === "GE" ? "bg-zinc-800 text-zinc-400"
                  : cls.appliesTo === "CS" ? "bg-sky-500/15 text-sky-400"
                  : "bg-violet-500/15 text-violet-400"
                }>{cls.appliesTo}</Badge>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <Input placeholder="Add a class (from ASSIST)…" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} />
          <Input className="w-36" placeholder="Cypress course #" value={newClass.course} onChange={(e) => setNewClass({ ...newClass, course: e.target.value })} />
          <Button variant="ghost" onClick={() => {
            if (!newClass.name.trim()) return;
            s.addTransferClass({ name: newClass.name.trim(), cypressCourse: newClass.course.trim() || "—", appliesTo: majorKey, status: "planned" });
            setNewClass({ name: "", course: "" });
          }}>Add</Button>
        </div>
        <p className="mt-2 text-[11.5px] text-zinc-600">
          Course numbers are seeded from Cypress&apos;s catalog pattern — verify each against the live articulation
          agreement on assist.org (Cypress College → {c.targetUC} → {c.major}) and adjust here.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-[14px] font-semibold">LSAT — target {c.lsatTarget}+</h2>
          <div className="mb-3 flex gap-2">
            <Input className="w-28" type="number" min={120} max={180} placeholder="Score" value={lsatInput} onChange={(e) => setLsatInput(e.target.value)} />
            <Button onClick={() => {
              const v = parseInt(lsatInput);
              if (v >= 120 && v <= 180) { s.addLsatScore(v); setLsatInput(""); }
            }}>Log practice test</Button>
          </div>
          {lsatTrend.length >= 2 ? (
            <TrendLine data={lsatTrend} dataKey="score" xKey="day" color="#d97706" height={180} />
          ) : (
            <p className="py-4 text-center text-[12.5px] text-zinc-600">
              Log timed practice tests and the trend line appears here. Daily logic drills are already in your schedule.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-[14px] font-semibold">The targets</h2>
          <ul className="flex flex-col gap-2 text-[12.5px] text-zinc-400">
            <li><span className="font-medium text-zinc-200">Harvard Law:</span> LSAT median ≈173, GPA median ≈3.9+ — your 175 target clears it</li>
            <li><span className="font-medium text-zinc-200">Yale Law:</span> LSAT median ≈175, GPA ≈3.95 — smallest class, softest numbers-only path; essays and story matter enormously</li>
            <li><span className="font-medium text-zinc-200">Patent bar:</span> requires a qualifying technical degree — both CS and EE work (EE is the classic Category A route)</li>
            <li><span className="font-medium text-zinc-200">Why this route wins:</span> patent attorneys with EE/CS degrees are scarce, billable rates are top-tier, and your tech background compounds with the business you&apos;re building now</li>
            <li className="text-zinc-600">Medians drift year to year — treat these as the bar to clear, not exact cutoffs.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
