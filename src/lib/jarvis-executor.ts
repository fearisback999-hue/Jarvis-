"use client";

// Client-side tool executor. Tools run against the user's local store —
// the server never touches personal data.

import { useJarvis, roiScore, financeSummary, prayerStreak, PILLARS } from "./store";
import type { Pillar, Task, ClassStatus } from "./store";
import { computePrayerTimes, nextPrayer, PRAYER_NAMES, type PrayerName } from "./prayer-times";
import { generateDayPlan } from "./scheduler";
import { todayKey, fmtHM, hmToMinutes, fmtDuration } from "./utils";
import { bridgeCmd, bridgeOnline } from "./desktop-bridge";

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

function careerReport() {
  const s = useJarvis.getState();
  const c = s.career;
  const done = c.classes.filter((cl) => cl.status === "done").length;
  const bestLsat = c.lsatScores.reduce((max, x) => Math.max(max, x.score), 0);
  return {
    targetUC: c.targetUC,
    major: c.major,
    gpa: c.gpa,
    lsatTarget: c.lsatTarget,
    bestLsatScore: bestLsat || null,
    lsatAttempts: c.lsatScores.length,
    classesDone: done,
    classesTotal: c.classes.length,
    classes: c.classes.map((cl) => ({ name: cl.name, cypressCourse: cl.cypressCourse, appliesTo: cl.appliesTo, status: cl.status })),
  };
}

// Site → open/search URL templates for "open X and search for Y" voice commands.
const SEARCH_TEMPLATES: Record<string, { open: string; search: (q: string) => string }> = {
  tiktok: { open: "https://www.tiktok.com", search: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}` },
  youtube: { open: "https://www.youtube.com", search: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  google: { open: "https://www.google.com", search: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  amazon: { open: "https://www.amazon.com", search: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  instagram: { open: "https://www.instagram.com", search: (q) => `https://www.instagram.com/explore/tags/${encodeURIComponent(q.replace(/\s+/g, ""))}/` },
  github: { open: "https://github.com", search: (q) => `https://github.com/search?q=${encodeURIComponent(q)}` },
  twitter: { open: "https://x.com", search: (q) => `https://x.com/search?q=${encodeURIComponent(q)}` },
  x: { open: "https://x.com", search: (q) => `https://x.com/search?q=${encodeURIComponent(q)}` },
  etsy: { open: "https://www.etsy.com", search: (q) => `https://www.etsy.com/search?q=${encodeURIComponent(q)}` },
  reddit: { open: "https://www.reddit.com", search: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}` },
  spotify: { open: "https://open.spotify.com", search: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  gmail: { open: "https://mail.google.com", search: (q) => `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(q)}` },
};

function resolveSearchUrl(site: string, query: string): string {
  const key = site.toLowerCase().trim().replace(/\.com$/, "").replace(/^www\./, "");
  const tpl = SEARCH_TEMPLATES[key];
  if (tpl) return tpl.search(query);
  return `https://www.google.com/search?q=${encodeURIComponent(`${site} ${query}`)}`;
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
    case "get_career_status":
      return careerReport();
    case "log_lsat_score": {
      s.addLsatScore(Number(input.score));
      return { ok: true, ...careerReport() };
    }
    case "update_transfer_class": {
      const q = String(input.name).toLowerCase();
      const match = s.career.classes.find((c) => c.name.toLowerCase().includes(q));
      if (!match) return { ok: false, error: `No class matching "${input.name}"`, classes: s.career.classes.map((c) => c.name) };
      s.updateClass(match.id, input.status as ClassStatus);
      return { ok: true, updated: match.name, status: input.status };
    }
    case "get_finance_summary":
      return financeReport();
    case "add_transaction": {
      s.addTransaction({
        amount: Number(input.amount),
        direction: input.direction as "income" | "expense",
        category: String(input.category),
        date: today,
        notes: input.notes ? String(input.notes) : undefined,
      });
      return { ok: true, ...financeReport() };
    }
    case "get_life_dashboard": {
      return {
        finance: financeReport(),
        topTasks: tasksReport().slice(0, 5),
        prayer: { streakDays: prayerStreak(s.prayerLogs), todayLogged: s.prayerLogs[today] ?? {} },
        career: careerReport(),
      };
    }
    case "open_url": {
      const url = String(input.url);
      if (!/^https?:\/\//.test(url)) return { ok: false, error: "Only http(s) URLs" };
      if (await bridgeOnline()) return bridgeCmd("open_url", { url });
      window.open(url, "_blank", "noopener");
      return { ok: true, opened: url };
    }
    case "desktop_open_app":
      return bridgeCmd("open_app", { app: String(input.app) });
    case "desktop_open_and_search": {
      const site = String(input.site);
      const query = String(input.query);
      const url = resolveSearchUrl(site, query);
      if (await bridgeOnline()) return bridgeCmd("open_url", { url });
      window.open(url, "_blank", "noopener");
      return { ok: true, opened: url, site, query };
    }
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
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}

// ── Deterministic local planner (no API key required) ───────────────

export async function localPlanner(text: string): Promise<string> {
  const q = text.toLowerCase();

  // ── Desktop: "open X and search/look up Y" ──────────────────────
  const openSearchMatch =
    q.match(/(?:open(?: up)?|go to|launch) (\w+(?:\.\w+)?) (?:and |to )?(?:search|look ?up|find)(?: for)? (.+)/) ??
    q.match(/(?:search|look ?up|find) (.+?) on (\w+(?:\.\w+)?)/);
  if (openSearchMatch) {
    const [site, query] = openSearchMatch[0].includes(" on ")
      ? [openSearchMatch[2], openSearchMatch[1]]
      : [openSearchMatch[1], openSearchMatch[2]];
    const cleanQuery = query.replace(/\s*videos?$/, "").trim();
    const r = await executeJarvisTool("desktop_open_and_search", { site, query: cleanQuery });
    return r.ok ? `Opening ${site} — searching for ${cleanQuery}.` : String(r.error ?? "Couldn't do that — is the desktop bridge running?");
  }

  // ── Desktop: open an app ─────────────────────────────────────────
  const appMatch = q.match(/open (up )?(chrome|google chrome|vs ?code|visual studio code|spotify|notepad|calculator|terminal|cmd|word|excel|explorer|finder|edge|firefox|safari|task manager|settings)/);
  if (appMatch) {
    const app = appMatch[2].replace("google chrome", "chrome").replace(/^vs ?code$|visual studio code/, "vs code");
    const r = await executeJarvisTool("desktop_open_app", { app });
    return r.ok ? `Opening ${app}.` : String(r.error ?? "Bridge offline.");
  }

  // ── Desktop: open a bare site ────────────────────────────────────
  const siteMatch = q.match(/open (up )?(youtube|gmail|tiktok|etsy|instagram|twitter|x\.com|amazon|github|reddit|spotify)/);
  if (siteMatch) {
    const site = siteMatch[2].replace("x.com", "x");
    const r = await executeJarvisTool("open_url", { url: `https://www.${site}.com` });
    return r.ok ? `Opening ${site}.` : String(r.error ?? "Couldn't open it.");
  }

  const searchMatch = q.match(/(?:search (?:google |the web )?for|google) (.+)/);
  if (searchMatch) {
    const r = await executeJarvisTool("desktop_open_and_search", { site: "google", query: searchMatch[1] });
    return r.ok ? `Searching for ${searchMatch[1]}.` : String(r.error ?? "Couldn't search.");
  }
  if (/volume (up|down)|turn (it |the volume )?(up|down)|^mute|unmute/.test(q)) {
    const action = q.includes("mute") ? "mute" : /volume up|turn.*up/.test(q) ? "up" : "down";
    const r = await executeJarvisTool("desktop_volume", { action });
    return r.ok ? `Volume ${action}.` : String(r.error ?? "Bridge offline.");
  }
  if (/(pause|resume|play) (the )?(music|song)|^(play|pause)$|next (song|track)|skip (this )?(song|track)|previous (song|track)/.test(q)) {
    const action = /next|skip/.test(q) ? "next" : /previous/.test(q) ? "prev" : "playpause";
    const r = await executeJarvisTool("desktop_media", { action });
    return r.ok ? "Done." : String(r.error ?? "Bridge offline.");
  }
  if (/take a screenshot|screenshot/.test(q)) {
    const r = await executeJarvisTool("desktop_screenshot", {});
    return r.ok ? `Screenshot saved${r.file ? ` to ${String(r.file)}` : ""}.` : String(r.error ?? "Bridge offline.");
  }
  if (/lock (my |the )?(pc|computer|screen)/.test(q)) {
    const r = await executeJarvisTool("desktop_lock", {});
    return r.ok ? "Locking your PC." : String(r.error ?? "Bridge offline.");
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
  if (/(lsat|law school|patent|transfer|assist|career)/.test(q)) {
    const c = careerReport();
    return `Career: targeting ${c.targetUC}, ${c.major}. Transfer checklist ${c.classesDone}/${c.classesTotal} done. ` +
      `Best LSAT so far: ${c.bestLsatScore ?? "none logged"} (target ${c.lsatTarget}, ${c.lsatAttempts} attempt${c.lsatAttempts === 1 ? "" : "s"}).`;
  }
  if (/(money|revenue|profit|income|made this month|spending|finance)/.test(q)) {
    const f = financeReport();
    return `This month: $${f.revenue.toFixed(0)} revenue, $${f.expenses.toFixed(0)} expenses → $${f.profit.toFixed(0)} profit. Net worth: $${f.netWorth.toFixed(0)}.`;
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
  if (q.includes("summar") || q.includes("briefing") || q.includes("how am i doing")) {
    const d = (await executeJarvisTool("get_life_dashboard", {})) as {
      finance: { profit: number; revenue: number }; prayer: { streakDays: number };
      career: { classesDone: number; classesTotal: number }; topTasks: { title: string; roi: number }[];
    };
    return `Briefing — Revenue $${d.finance.revenue.toFixed(0)} (profit $${d.finance.profit.toFixed(0)}) this month. ` +
      `Prayer streak ${d.prayer.streakDays}d. Career checklist ${d.career.classesDone}/${d.career.classesTotal}. ` +
      `Top focus: ${d.topTasks[0]?.title ?? "add tasks"}.`;
  }
  return (
    `I'm running in offline mode (no API key configured) with basic commands: "open TikTok and look up boxing videos", "plan my day", ` +
    `"prayer times", "what are my priorities", "how much money did I make this month", "add a task to …", "career status", "morning briefing". ` +
    `Add ANTHROPIC_API_KEY or a local LLM in .env.local to unlock the full agentic brain — see README.`
  );
}
