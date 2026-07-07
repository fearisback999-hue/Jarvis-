"use client";

import { Fragment, useState } from "react";
import { useJarvis, roiScore, PILLARS } from "@/lib/store";
import type { Pillar, Task } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, SectionHeader, Button, Input, Select, Badge, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";

export default function TasksPage() {
  const mounted = useMounted();
  const s = useJarvis();
  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<Pillar>("business");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [impact, setImpact] = useState("7");
  const [effort, setEffort] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  if (!mounted) return null;

  const open = s.tasks.filter((t) => t.status !== "done" && !t.parentId).sort((a, b) => roiScore(b) - roiScore(a));
  const done = s.tasks.filter((t) => t.status === "done" && !t.parentId);
  const subtasksOf = (id: string) => s.tasks.filter((t) => t.parentId === id);

  const add = () => {
    if (!title.trim()) return;
    s.addTask({
      title: title.trim(), pillar, priority,
      impact: parseInt(impact) || 5,
      effortHours: parseFloat(effort) || 1,
      deadline: deadline || undefined,
      recurrence: "",
    });
    setTitle(""); setDeadline("");
  };

  const TaskRow = ({ t, sub = false }: { t: Task; sub?: boolean }) => (
    <li className={cn("rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2", sub && "ml-8 border-white/[0.03]")}>
      <div className="flex items-center gap-2.5">
        <button onClick={() => s.updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })} aria-label="Toggle done">
          {t.status === "done"
            ? <CheckCircle2 size={16} className="text-emerald-400" />
            : <Circle size={16} className="text-zinc-700 hover:text-emerald-400" />}
        </button>
        <span className={cn("min-w-0 flex-1 truncate text-[13px]", t.status === "done" && "text-zinc-600 line-through")}>{t.title}</span>
        {!sub && <Badge className={PILLARS[t.pillar].badge}>{PILLARS[t.pillar].label}</Badge>}
        {t.deadline && <span className="tabular text-[11px] text-zinc-500">{t.deadline.slice(5)}</span>}
        {t.priority === "critical" && <Badge className="bg-rose-500/15 text-rose-400">critical</Badge>}
        {!sub && <span className="tabular text-[12px] font-semibold text-emerald-400">ROI {roiScore(t)}</span>}
        {!sub && (
          <button onClick={() => setSubtaskFor(subtaskFor === t.id ? null : t.id)} className="text-zinc-700 hover:text-zinc-400" title="Add subtask">
            <Plus size={13} />
          </button>
        )}
        <button onClick={() => s.deleteTask(t.id)} className="text-zinc-700 hover:text-rose-400" aria-label="Delete task">
          <Trash2 size={13} />
        </button>
      </div>
      {subtaskFor === t.id && (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Subtask…" value={subtaskTitle} autoFocus
            onChange={(e) => setSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && subtaskTitle.trim()) {
                s.addTask({ title: subtaskTitle.trim(), pillar: t.pillar, priority: "medium", impact: t.impact, effortHours: 0.5, parentId: t.id });
                setSubtaskTitle("");
              }
            }}
          />
        </div>
      )}
    </li>
  );

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader title="Tasks" subtitle="Everything ranked by return on your time — impact × pillar weight × urgency ÷ effort." />

      <Card>
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-48 flex-1" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}>
            {Object.entries(PILLARS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>
            {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input className="w-20" type="number" title="Impact 1-10" placeholder="impact" value={impact} onChange={(e) => setImpact(e.target.value)} />
          <Input className="w-20" type="number" step="0.25" title="Effort hours" placeholder="hours" value={effort} onChange={(e) => setEffort(e.target.value)} />
          <Input className="w-36" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <Button onClick={add}><Plus size={13} /> Add</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-semibold">Open — ranked by ROI</h2>
        {open.length === 0 ? (
          <EmptyState>All clear. Add a task or ask JARVIS what to focus on.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {open.map((t) => (
              <Fragment key={t.id}>
                <TaskRow t={t} />
                {subtasksOf(t.id).map((st) => <TaskRow key={st.id} t={st} sub />)}
              </Fragment>
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card>
          <h2 className="mb-3 text-[14px] font-semibold text-zinc-500">Done ({done.length})</h2>
          <ul className="flex flex-col gap-1.5">
            {done.slice(0, 10).map((t) => <TaskRow key={t.id} t={t} />)}
          </ul>
        </Card>
      )}
    </div>
  );
}
