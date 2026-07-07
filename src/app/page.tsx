"use client";

import Link from "next/link";
import { useJarvis, roiScore, financeSummary, prayerStreak, readinessScore, PILLARS } from "@/lib/store";
import { computePrayerTimes, nextPrayer } from "@/lib/prayer-times";
import { generateDayPlan, BLOCK_STYLES } from "@/lib/scheduler";
import { todayKey, fmtHM, fmtMoney, fmtDuration } from "@/lib/utils";
import { useMounted, useNow } from "@/hooks/use-mounted";
import { Card, StatCard, Badge, Button, SectionHeader } from "@/components/ui";
import { Sparkles, CalendarClock, ArrowRight } from "lucide-react";

export default function CommandCenter() {
  const mounted = useMounted();
  const now = useNow(1000);
  const s = useJarvis();

  if (!mounted) return null;

  const hour = now.getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const times = computePrayerTimes(now, s.profile.latitude, s.profile.longitude, s.profile.method, s.profile.asrMethod);
  const next = nextPrayer(times, now);
  const nextName = next.name.replace("_tomorrow", "");

  const fin = financeSummary(s.transactions);
  const goal = s.goals.find((g) => g.horizon === "monthly");
  const streak = prayerStreak(s.prayerLogs);
  const readiness = readinessScore(s.health[todayKey()]);

  const topTasks = s.tasks
    .filter((t) => t.status !== "done" && !t.parentId)
    .sort((a, b) => roiScore(b) - roiScore(a))
    .slice(0, 4);

  const todayBlocks = s.blocks.filter((b) => b.date === todayKey()).sort((a, b) => a.start - b.start);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = todayBlocks.filter((b) => b.end > nowMin).slice(0, 6);

  return (
    <div className="fade-up flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {s.profile.name}.</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            {nextName[0].toUpperCase() + nextName.slice(1)} in{" "}
            <span className="tabular font-medium text-teal-400">{fmtDuration(next.minutesUntil)}</span>
            {" "}· {fmtHM(next.at)}
          </p>
        </div>
        <Link href="/jarvis">
          <Button><Sparkles size={14} /> Ask JARVIS</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={fmtMoney(fin.revenue)} accent="#10b981"
          sub={goal ? `${Math.round((fin.revenue / goal.target) * 100)}% of ${fmtMoney(goal.target)} goal` : undefined} />
        <StatCard label="Profit" value={fmtMoney(fin.profit)} />
        <StatCard label="Prayer streak" value={`${streak}d`} accent="#2dd4bf" sub="all five, on time" />
        <StatCard label="Readiness" value={readiness ?? "—"} sub={readiness == null ? "log sleep & energy" : readiness >= 75 ? "train hard today" : "prioritize recovery"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Highest-ROI focus</h2>
            <Link href="/tasks" className="flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-300">
              All tasks <ArrowRight size={12} />
            </Link>
          </div>
          {topTasks.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-zinc-600">No open tasks — add some and JARVIS will rank them.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topTasks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <span className="tabular text-[13px] font-semibold text-zinc-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">{t.title}</div>
                    <Badge className={PILLARS[t.pillar].badge}>{PILLARS[t.pillar].label}</Badge>
                  </div>
                  <span className="tabular text-[12px] font-semibold text-emerald-400">ROI {roiScore(t)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Today</h2>
            <Link href="/schedule" className="flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-300">
              Full schedule <ArrowRight size={12} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-[13px] text-zinc-600">No plan generated for today yet.</p>
              <Button
                variant="ghost"
                onClick={() => s.setBlocksForDate(todayKey(), generateDayPlan({ profile: s.profile, tasks: s.tasks }))}
              >
                <CalendarClock size={14} /> Generate today&apos;s plan
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {upcoming.map((b) => {
                const active = b.start <= nowMin && b.end > nowMin;
                return (
                  <li key={b.id} className="flex items-center gap-2.5 text-[13px]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BLOCK_STYLES[b.type].color }} />
                    <span className="tabular w-[104px] shrink-0 text-zinc-500">{fmtHM(b.start)}–{fmtHM(b.end)}</span>
                    <span className={active ? "font-medium text-emerald-400" : "text-zinc-300"}>
                      {b.title}{active && " · now"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/business/tiktok", label: "TikTok Shop", note: `${s.products.filter((p) => p.platform === "tiktok").length} products tracked` },
          { href: "/business/etsy", label: "Etsy queue", note: `${s.listings.filter((l) => l.state !== "published").length} listings pending` },
          { href: "/boxing", label: "Boxing", note: `${s.boxingSessions.length} sessions logged` },
          { href: "/law", label: "Law roadmap", note: `${s.lawMilestones.filter((m) => m.status === "done").length}/${s.lawMilestones.length} milestones` },
        ].map((x) => (
          <Link key={x.href} href={x.href}>
            <Card className="transition-colors hover:border-white/[0.16]">
              <div className="text-[13px] font-medium">{x.label}</div>
              <div className="mt-0.5 text-[12px] text-zinc-500">{x.note}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
