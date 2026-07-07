"use client";

import { useJarvis } from "@/lib/store";
import { generateDayPlan, reflowMissedBlocks, BLOCK_STYLES } from "@/lib/scheduler";
import { todayKey, fmtHM, cn } from "@/lib/utils";
import { useMounted, useNow } from "@/hooks/use-mounted";
import { Card, SectionHeader, Button, Badge, EmptyState } from "@/components/ui";
import { CalendarClock, Check, RefreshCcw, X } from "lucide-react";

export default function SchedulePage() {
  const mounted = useMounted();
  const now = useNow(30000);
  const s = useJarvis();
  if (!mounted) return null;

  const today = todayKey();
  const blocks = s.blocks.filter((b) => b.date === today).sort((a, b) => a.start - b.start);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const regenerate = () => s.setBlocksForDate(today, generateDayPlan({ profile: s.profile, tasks: s.tasks }));
  const reflow = () => s.setBlocksForDate(today, reflowMissedBlocks(blocks, now));

  return (
    <div className="fade-up flex flex-col gap-4">
      <SectionHeader
        title="Smart Schedule"
        subtitle="Built around prayer anchors, filled by ROI. Missed blocks reflow automatically."
        right={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reflow} title="Move missed blocks into remaining free time">
              <RefreshCcw size={13} /> Reflow missed
            </Button>
            <Button onClick={regenerate}><CalendarClock size={13} /> Generate today</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {Object.entries(BLOCK_STYLES).map(([type, st]) => (
          <span key={type} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="h-2 w-2 rounded-full" style={{ background: st.color }} /> {st.label}
          </span>
        ))}
      </div>

      {blocks.length === 0 ? (
        <EmptyState>
          <p>No plan for today yet.</p>
          <Button className="mt-2" onClick={regenerate}><CalendarClock size={13} /> Generate today&apos;s plan</Button>
        </EmptyState>
      ) : (
        <Card className="p-2">
          <ul className="flex flex-col">
            {blocks.map((b) => {
              const active = b.start <= nowMin && b.end > nowMin;
              const past = b.end <= nowMin;
              return (
                <li
                  key={b.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px]",
                    active && "bg-emerald-500/[0.06]",
                    past && b.status === "planned" && "opacity-60"
                  )}
                >
                  <span className="w-1 self-stretch rounded-full" style={{ background: BLOCK_STYLES[b.type].color }} />
                  <span className="tabular w-[110px] shrink-0 text-zinc-500">{fmtHM(b.start)}–{fmtHM(b.end)}</span>
                  <span className={cn("min-w-0 flex-1 truncate", b.status === "done" && "text-zinc-600 line-through", active && "font-medium text-emerald-300")}>
                    {b.title}
                  </span>
                  {b.status === "missed" && <Badge className="bg-rose-500/15 text-rose-400">missed</Badge>}
                  {active && <Badge className="bg-emerald-500/15 text-emerald-400">now</Badge>}
                  {b.type !== "prayer" && b.type !== "sleep" && (
                    <span className="flex gap-1">
                      <button
                        onClick={() => s.updateBlock(b.id, { status: b.status === "done" ? "planned" : "done" })}
                        className={cn("rounded p-1", b.status === "done" ? "text-emerald-400" : "text-zinc-700 hover:text-emerald-400")}
                        title="Mark done"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => s.updateBlock(b.id, { status: "missed" })}
                        className="rounded p-1 text-zinc-700 hover:text-rose-400"
                        title="Mark missed"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="text-[13px] text-zinc-500">
        Prayer blocks are fixed anchors and can&apos;t be moved. Ask JARVIS things like
        <span className="text-zinc-300"> &quot;move my gym session to 6 PM&quot;</span> or
        <span className="text-zinc-300"> &quot;plan my day&quot;</span> — it edits this schedule directly.
      </Card>
    </div>
  );
}
