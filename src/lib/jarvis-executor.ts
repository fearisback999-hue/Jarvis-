"use client";

// Client-side tool executor. Tools run against the user's local store —
// the server never touches personal data.

import { useJarvis, roiScore, financeSummary, prayerStreak, readinessScore, PILLARS } from "./store";
import type { Pillar, Task, WorkoutSet } from "./store";
import { computePrayerTimes, nextPrayer, PRAYER_NAMES, type PrayerName } from "./prayer-times";
import { generateDayPlan } from "./scheduler";
import { todayKey, fmtHM, hmToMinutes, fmtDuration, lastNDays } from "./utils";
import { bridgeCmd, bridgeOnline } from "./desktop-bridge";
import { billsSummary } from "./spending-guard";

type Json = Record<string, unknown>;

function prayerReport() {
  const s = useJarvis.getState();
  const times = computePrayerTimes(new Date(), s.profile.latitude, s.profile.longitude, s.profile.method, s.profile.asrMethod);
  const next = nextPrayer(times);
  return {
    times: Object.fromEntries(PRAYER_NAMES.map((p) => [p, fmtHM(times[p])])),
    sunrise: fmtHM(times.sunrise),
    next: { name: next.name.replace("_tomorrow", " (tomorrow)"), in: fmtDuration(next.minutesUntil), at: fmtHM(next.at) },
    todayLogged: s.prayerLogs[todayKey()] ?? {},
    streakDays: prayerStreak(s.prayerLogs),
  };
}

function scheduleReport() {
  const s = useJarvis.getState();
  const blocks = s.blocks.filter((b) => b.date === todayKey()).sort((a, b) => a.start - b.start);
  return blocks.map((b) => ({ time: `${fmtHM(b.start)}–${fmtHM(b.end)}`, title: b.title, type: b.type, status: b.status }));
}

function tasksReport() {
  const s = useJarvis.getState();
  return s.tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({ title: t.title, pillar: t.pillar, priority: t.priority, roi: roiScore(t), deadline: t.deadline }))
    .sort((a, b) => b.roi - a.roi);
}

function financeReport() {
  const s = useJarvis.getState();
  const f = financeSummary(s.transactions);
  const netWorth = s.accounts.reduce((a, acc) => a + acc.balance, 0);
  return { month: todayKey().slice(0, 7), ...f, netWorth, goals: s.goals };
}

export async function executeJarvisTool(name: string, input: Json): Promise<Json> {
  const s = useJarvis.getState();
  const today = todayKey();

  switch (name) {
    case "create_task": {
      const task = s.addTask({
        title: String(input.title),
        pillar: (input.pillar as Pillar) ?? "self",
        priority: (input.priority as Task["priority"]) ?? "medium",
        impact: Number(input.impact ?? 6),
        effortHours: Number(input.effortHours ?? 1),
        deadline: input.deadline ? String(input.deadline) : undefined,
      });
      return { ok: true, created: task.title, roi: roiScore(task) };
    }
    case "complete_task": {
      const q = String(input.title).toLowerCase();
      const match = s.tasks.find((t) => t.status !== "done" && t.title.toLowerCase().includes(q));
      if (!match) return { ok: false, error: "No open task matching that title" };
      s.updateTask(match.id, { status: "done" });
      return { ok: true, completed: match.title };
    }
    case "list_tasks":
      return { tasks: tasksReport() };
    case "get_schedule":
      return { date: today, blocks: scheduleReport() };
    case "generate_schedule": {
      const blocks = generateDayPlan({ profile: s.profile, tasks: s.tasks });
      s.setBlocksForDate(today, blocks);
      return { ok: true, blocks: scheduleReport() };
    }
    case "move_block": {
      const q = String(input.title).toLowerCase();
      const block = s.blocks.find((b) => b.date === today && b.title.toLowerCase().includes(q));
      if (!block) return { ok: false, error: "No block matching that title today" };
      if (block.type === "prayer") return { ok: false, error: "Prayer times are fixed anchors and cannot be moved" };
      const dur = block.end - block.start;
      const newStart = hmToMinutes(String(input.newStart));
      s.updateBlock(block.id, { start: newStart, end: newStart + dur });
      return { ok: true, moved: block.title, to: fmtHM(newStart) };
    }
    case "get_prayer_times":
      return prayerReport();
    case "log_prayer": {
      s.logPrayer(today, input.prayer as PrayerName, input.status as "on_time");
      return { ok: true, logged: input.prayer, status: input.status };
    }
    case "get_bills_summary": {
      const sum = billsSummary(s);
      return {
        ...sum,
        overdue: sum.overdue.map((b) => ({ name: b.name, amount: b.amount, dueDay: b.dueDay })),
        dueSoon: sum.dueSoon.map((b) => ({ name: b.name, amount: b.amount, dueDay: b.dueDay })),
        rules: s.spendingRules,
        note: "Payments can only be approved by the user on the Bills page — never by JARVIS.",
      };
    }
    case "add_bill": {
      s.addBill({
        name: String(input.name),
        amount: Number(input.amount),
        dueDay: Math.min(28, Math.max(1, Number(input.dueDay ?? 1))),
        category: String(input.category ?? "other"),
        autopay: false,
      });
      return { ok: true, added: input.name, monthlyTotal: billsSummary(useJarvis.getState()).needed };
    }
    case "get_finance_summary":
      return financeReport();
    case "add_transaction": {
      s.addTransaction({
        amount: Number(input.amount),
        direction: input.direction as "income" | "expense",
        category: String(input.category),
        source: (input.source as "tiktok") ?? "other",
        date: today,
        notes: input.notes ? String(input.notes) : undefined,
      });
      return { ok: true, ...financeReport() };
    }
    case "log_workout": {
      const sets = ((input.sets as Json[]) ?? []).map((x, i) => ({
        exercise: String(x.exercise),
        muscleGroup: String(x.muscleGroup ?? "other"),
        reps: Number(x.reps),
        weight: Number(x.weight),
        setNumber: i + 1,
      })) as unknown as WorkoutSet[];
      s.addWorkout({ date: today, name: String(input.name), sets });
      return { ok: true, logged: input.name, sets: sets.length };
    }
    case "log_health": {
      const patch: Json = {};
      for (const k of ["calories", "protein", "waterMl", "sleepHours", "weight", "mood", "energy"])
        if (input[k] != null) patch[k] = Number(input[k]);
      s.logHealth(today, patch);
      return { ok: true, logged: patch };
    }
    case "add_product_idea": {
      s.addProduct({
        platform: input.platform as "tiktok" | "etsy",
        name: String(input.name),
        status: "research",
        notes: input.notes ? String(input.notes) : undefined,
      });
      return { ok: true, added: input.name };
    }
    case "add_content_idea": {
      s.addContent({
        hook: String(input.hook),
        script: input.script ? String(input.script) : undefined,
        caption: input.caption ? String(input.caption) : undefined,
        posted: false, views: 0, sales: 0,
      });
      return { ok: true, added: input.hook };
    }
    case "add_etsy_listing_draft": {
      s.addListing({
        title: String(input.title),
        description: input.description ? String(input.description) : undefined,
        tags: ((input.tags as string[]) ?? []).slice(0, 13),
        price: input.price ? Number(input.price) : undefined,
        state: "draft",
      });
      return { ok: true, drafted: input.title };
    }
    case "get_life_dashboard": {
      const health = s.health[today];
      const week = lastNDays(7);
      const gymVolume = s.workouts.filter((w) => week.includes(w.date)).reduce((a, w) => a + w.sets.length, 0);
      const boxingMins = s.boxingSessions.filter((b) => week.includes(b.date)).reduce((a, b) => a + b.minutes, 0);
      return {
        finance: financeReport(),
        topTasks: tasksReport().slice(0, 5),
        prayer: { streakDays: prayerStreak(s.prayerLogs), todayLogged: s.prayerLogs[today] ?? {} },
        readiness: readinessScore(health),
        trainingThisWeek: { gymSets: gymVolume, boxingMinutes: boxingMins },
      };
    }
    case "open_url": {
      const url = String(input.url);
      if (!/^https?:\/\//.test(url)) return { ok: false, error: "Only http(s) URLs" };
      if (await bridgeOnline()) return bridgeCmd("open_url", { url });
      window.open(url, "_blank", "noopener");
      return { ok: true, opened: url };
    }
    case "tiktok_product_search": {
      const q = String(input.query).trim();
      const urls = [
        `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?keyword=${encodeURIComponent(q)}`,
        `https://www.tiktok.com/search?q=${encodeURIComponent(q + " tiktok shop")}`,
        `https://trends.google.com/trends/explore?q=${encodeURIComponent(q)}`,
      ];
      const viaBridge = await bridgeOnline();
      for (const url of urls) {
        if (viaBridge) await bridgeCmd("open_url", { url });
        else window.open(url, "_blank", "noopener");
      }
      s.addProduct({ platform: "tiktok", name: `[research] ${q}`, status: "research", notes: "Product search run" });
      return { ok: true, query: q, opened: urls, note: "Creative Center top ads, TikTok Shop search, and Google Trends opened; research entry added to the pipeline." };
    }
    case "desktop_open_app":
      return bridgeCmd("open_app", { app: String(input.app) });
    case "desktop_search":
      return bridgeCmd("search", { query: String(input.query) });
    case "desktop_volume":
      return bridgeCmd("volume", { action: String(input.action), level: input.level == null ? undefined : Number(input.level) });
    case "desktop_media":
      return bridgeCmd("media", { action: String(input.action) });
    case "desktop_type":
      return bridgeCmd("type", { text: String(input.text) });
    case "desktop_screenshot":
      return bridgeCmd("screenshot", {});
    case "desktop_lock":
      return bridgeCmd("lock", {});
    case "pod_engine_status": {
      const res = await fetch("/api/pod");
      return (await res.json()) as Json;
    }
    case "pod_engine_action": {
      const res = await fetch("/api/pod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: String(input.action) }),
      });
      return (await res.json()) as Json;
    }
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}

// ── Deterministic local planner (no API key required) ───────────────

export async function localPlanner(text: string): Promise<string> {
  const q = text.toLowerCase();
  const s = useJarvis.getState();

  // ── Desktop control ─────────────────────────────────────────────
  const appMatch = q.match(/open (up )?(chrome|google chrome|vs ?code|visual studio code|spotify|notepad|calculator|terminal|cmd|word|excel|explorer|finder|edge|firefox|safari|task manager|settings)/);
  if (appMatch) {
    const app = appMatch[2].replace("google chrome", "chrome").replace(/^vs ?code$|visual studio code/, "vs code");
    const r = await executeJarvisTool("desktop_open_app", { app });
    return r.ok ? `Opening ${app}.` : String(r.error ?? r.err ?? "Bridge offline.");
  }
  const siteMatch = q.match(/open (up )?(youtube|gmail|tiktok|etsy|printify|instagram|twitter|x\.com|amazon|github)/);
  if (siteMatch) {
    const site = siteMatch[2].replace("x.com", "x");
    const r = await executeJarvisTool("open_url", { url: `https://www.${site}.com` });
    return r.ok ? `Opening ${site}.` : String(r.error ?? "Couldn't open it.");
  }
  const searchMatch = q.match(/(?:search (?:google |the web )?for|google) (.+)/);
  if (searchMatch) {
    const r = (await bridgeOnline())
      ? await executeJarvisTool("desktop_search", { query: searchMatch[1] })
      : await executeJarvisTool("open_url", { url: `https://www.google.com/search?q=${encodeURIComponent(searchMatch[1])}` });
    return r.ok ? `Searching for ${searchMatch[1]}.` : String(r.error ?? r.err ?? "Couldn't search.");
  }
  if (/volume (up|down)|turn (it |the volume )?(up|down)|^mute|unmute/.test(q)) {
    const action = q.includes("mute") ? "mute" : /volume up|turn.*up/.test(q) ? "up" : "down";
    const r = await executeJarvisTool("desktop_volume", { action });
    return r.ok ? `Volume ${action}.` : String(r.error ?? r.err ?? "Bridge offline.");
  }
  if (/(pause|resume|play) (the )?(music|song)|^(play|pause)$|next (song|track)|skip (this )?(song|track)|previous (song|track)/.test(q)) {
    const action = /next|skip/.test(q) ? "next" : /previous/.test(q) ? "prev" : "playpause";
    const r = await executeJarvisTool("desktop_media", { action });
    return r.ok ? "Done." : String(r.error ?? r.err ?? "Bridge offline.");
  }
  if (/take a screenshot|screenshot/.test(q)) {
    const r = await executeJarvisTool("desktop_screenshot", {});
    return r.ok ? `Screenshot saved${r.file ? ` to ${String(r.file)}` : ""}.` : String(r.error ?? r.err ?? "Bridge offline.");
  }
  if (/lock (my |the )?(pc|computer|screen)/.test(q)) {
    const r = await executeJarvisTool("desktop_lock", {});
    return r.ok ? "Locking your PC." : String(r.error ?? r.err ?? "Bridge offline.");
  }

  // ── POD engine ──────────────────────────────────────────────────
  if (/pod|print on demand/.test(q)) {
    if (/run|start|trigger|launch/.test(q) && /pipeline|engine|automation/.test(q)) {
      const r = await executeJarvisTool("pod_engine_action", { action: "run_pipeline" });
      return r.ok ? "POD pipeline triggered — it's generating and listing products now." : String(r.error ?? "POD engine unreachable.");
    }
    if (/sync.*order/.test(q)) {
      const r = await executeJarvisTool("pod_engine_action", { action: "sync_orders" });
      return r.ok ? "Order sync triggered." : String(r.error ?? "POD engine unreachable.");
    }
    if (/optimi[sz]e/.test(q)) {
      const r = await executeJarvisTool("pod_engine_action", { action: "optimize" });
      return r.ok ? "Listing optimization triggered." : String(r.error ?? "POD engine unreachable.");
    }
    const st = (await executeJarvisTool("pod_engine_status", {})) as { configured?: boolean; online?: boolean };
    return !st.configured
      ? "POD engine isn't configured yet — set POD_ENGINE_URL and POD_CRON_SECRET in .env.local."
      : st.online
        ? "POD engine is online. Say 'run the pod pipeline', 'sync pod orders', or 'optimize pod listings'."
        : "POD engine is configured but not responding right now.";
  }

  // ── Product research ────────────────────────────────────────────
  const prodMatch = q.match(/(?:find|research|search)(?: for)? (?:winning |trending )?products?(?: for| in| about)? (.+)|product search (?:for )?(.+)/);
  if (prodMatch) {
    const query = (prodMatch[1] ?? prodMatch[2]).trim();
    await executeJarvisTool("tiktok_product_search", { query });
    return `Product search running for "${query}" — Creative Center, TikTok Shop and Google Trends are open.`;
  }

  if (/(plan|generate|make).*(day|schedule)|schedule.*(day|today)/.test(q) || q.includes("plan my day")) {
    await executeJarvisTool("generate_schedule", {});
    const blocks = scheduleReport();
    return `Done — I built today's plan around your prayer times. ${blocks.length} blocks:\n` +
      blocks.map((b) => `• ${b.time} — ${b.title}`).join("\n");
  }
  if (q.includes("prayer") || q.includes("salah") || q.includes("namaz")) {
    const p = prayerReport();
    return `Next prayer: ${p.next.name} in ${p.next.in} (${p.next.at}).\n` +
      Object.entries(p.times).map(([k, v]) => `• ${k[0].toUpperCase()}${k.slice(1)}: ${v}`).join("\n") +
      `\nStreak: ${p.streakDays} day${p.streakDays === 1 ? "" : "s"}.`;
  }
  if (/(priorit|roi|focus|what should i)/.test(q)) {
    const tasks = tasksReport().slice(0, 5);
    if (!tasks.length) return "No open tasks. Add some and I'll rank them by ROI.";
    return "Highest-ROI actions right now:\n" +
      tasks.map((t, i) => `${i + 1}. ${t.title} — ${PILLARS[t.pillar as Pillar].label}, ROI ${t.roi}`).join("\n");
  }
  if (/(bills?|business expenses?|how much.*(need|expenses)|monthly expenses?)/.test(q)) {
    const sum = billsSummary(s);
    const bal = sum.balance != null ? ` Bank balance $${sum.balance.toFixed(0)} — ${sum.funded ? "fully funded including your buffer" : "NOT enough to cover what's left plus the buffer"}.` : " Link a bank on the Bills page to check funding.";
    return `Business expenses for ${sum.month}: $${sum.needed.toFixed(2)} needed, $${sum.paid.toFixed(2)} paid, $${sum.remaining.toFixed(2)} still due` +
      (sum.overdue.length ? ` (${sum.overdue.length} overdue: ${sum.overdue.map((b) => b.name).join(", ")})` : "") +
      `.${bal} I can add bills, but only you can approve payments — Bills page.`;
  }
  if (/(money|revenue|profit|income|made this month|finance)/.test(q)) {
    const f = financeReport();
    return `This month: $${f.revenue.toFixed(0)} revenue, $${f.expenses.toFixed(0)} expenses → $${f.profit.toFixed(0)} profit. ` +
      `TikTok $${f.bySource.tiktok.toFixed(0)} · Etsy $${f.bySource.etsy.toFixed(0)} · Other $${f.bySource.other.toFixed(0)}. Net worth: $${f.netWorth.toFixed(0)}.`;
  }
  if (/(add|create).*(task|todo)/.test(q)) {
    const title = text.replace(/.*(add|create)( a)? (task|todo)( to| for|:)?/i, "").trim() || "New task";
    await executeJarvisTool("create_task", { title, pillar: "self" });
    return `Task created: "${title}". Tell me its pillar, impact and effort to sharpen the ROI ranking.`;
  }
  if (q.includes("task")) {
    const tasks = tasksReport();
    return tasks.length
      ? `${tasks.length} open tasks, top ranked by ROI:\n` + tasks.slice(0, 7).map((t, i) => `${i + 1}. ${t.title} (${t.roi})`).join("\n")
      : "No open tasks.";
  }
  if (/(open|launch|go to) (youtube|google|gmail|chrome)/.test(q)) {
    const site = q.match(/(youtube|google|gmail)/)?.[1] ?? "google";
    await executeJarvisTool("open_url", { url: `https://www.${site}.com` });
    return `Opening ${site}.`;
  }
  if (q.includes("summar") || q.includes("briefing") || q.includes("how am i doing")) {
    const d = (await executeJarvisTool("get_life_dashboard", {})) as {
      finance: { profit: number; revenue: number }; prayer: { streakDays: number };
      readiness: number | null; topTasks: { title: string; roi: number }[];
    };
    return `Briefing — Revenue $${d.finance.revenue.toFixed(0)} (profit $${d.finance.profit.toFixed(0)}) this month. ` +
      `Prayer streak ${d.prayer.streakDays}d. Readiness ${d.readiness ?? "—"}. ` +
      `Top focus: ${d.topTasks[0]?.title ?? "add tasks"}.`;
  }
  return (
    `I'm running in offline mode (no API key configured) with basic commands: "plan my day", "prayer times", ` +
    `"what are my priorities", "how much money did I make this month", "add a task to …", "morning briefing", "open YouTube". ` +
    `Add ANTHROPIC_API_KEY in .env.local to unlock the full agentic brain — see README.` +
    (s.profile.name ? "" : "")
  );
}
