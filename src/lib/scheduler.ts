// Smart Scheduler — builds the day around prayer anchors, then fills free
// time with the highest-ROI work. Missed blocks reflow to the next free slot.

import { computePrayerTimes, PRAYER_NAMES } from "./prayer-times";
import type { JarvisState, ScheduleBlock, Task, BlockType } from "./store";
import { roiScore } from "./store";
import { uid } from "./utils";

const PRAYER_DURATION = 20; // minutes reserved per prayer

interface FreeSlot { start: number; end: number; }

function subtractBlock(slots: FreeSlot[], start: number, end: number): FreeSlot[] {
  const out: FreeSlot[] = [];
  for (const s of slots) {
    if (end <= s.start || start >= s.end) { out.push(s); continue; }
    if (start > s.start) out.push({ start: s.start, end: start });
    if (end < s.end) out.push({ start: end, end: s.end });
  }
  return out;
}

export function generateDayPlan(
  state: Pick<JarvisState, "profile" | "tasks">,
  date: Date = new Date()
): ScheduleBlock[] {
  const { profile, tasks } = state;
  const dateKey = date.toISOString().slice(0, 10);
  const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
  const times = computePrayerTimes(date, profile.latitude, profile.longitude, profile.method, profile.asrMethod);

  const blocks: ScheduleBlock[] = [];
  const push = (start: number, end: number, type: BlockType, title: string, taskId?: string) =>
    blocks.push({ id: uid(), date: dateKey, start: Math.round(start), end: Math.round(end), type, title, taskId, status: "planned" });

  // 1. Prayer anchors — non-negotiable
  const prayerLabels: Record<string, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
  for (const p of PRAYER_NAMES) push(times[p], times[p] + PRAYER_DURATION, "prayer", prayerLabels[p]);

  // 2. Fixed anchors
  const wake = times.fajr - 15;
  // Isha can wrap past midnight (high latitudes / timezone edge cases) —
  // clamp bedtime into the 21:00–23:59 window so the day keeps free slots.
  const sleepStart = Math.min(23 * 60, Math.max(21 * 60, times.isha + 150));
  push(times.fajr + PRAYER_DURATION, times.fajr + PRAYER_DURATION + 15, "study", "Qur'an reading");
  push(times.fajr + PRAYER_DURATION + 20, times.fajr + PRAYER_DURATION + 60, "roadwork", "Roadwork / conditioning");
  if (isWeekday) push(8 * 60, 15 * 60, "school", "School");
  // Gym after Asr
  push(times.asr + PRAYER_DURATION + 10, times.asr + PRAYER_DURATION + 85, "gym", "Gym — strength");
  push(times.maghrib + PRAYER_DURATION, times.maghrib + PRAYER_DURATION + 40, "meal", "Dinner + family");
  push(sleepStart, 24 * 60 - 1, "sleep", "Sleep");

  // 3. Free slots = day minus everything above
  let free: FreeSlot[] = [{ start: wake, end: sleepStart }];
  for (const b of blocks) free = subtractBlock(free, b.start - 5, b.end + 5);
  free = free.filter((s) => s.end - s.start >= 30);

  // 4. Fill highest-ROI tasks into free slots
  const open = tasks
    .filter((t) => t.status !== "done" && !t.parentId)
    .sort((a, b) => roiScore(b) - roiScore(a));

  for (const slot of free) {
    let cursor = slot.start;
    while (slot.end - cursor >= 30 && open.length) {
      const task = open.shift() as Task;
      const mins = Math.min(Math.max(30, task.effortHours * 60), slot.end - cursor);
      const type: BlockType =
        task.pillar === "business" || task.pillar === "wealth" ? "business"
        : task.pillar === "law" || task.pillar === "self" ? "study"
        : "deep_work";
      push(cursor, cursor + mins, type, task.title, task.id);
      cursor += mins + 10;
    }
  }

  return blocks.sort((a, b) => a.start - b.start);
}

// Reflow: move today's missed (past, not done) flexible blocks into the
// remaining free time after `now`.
export function reflowMissedBlocks(blocks: ScheduleBlock[], now: Date = new Date()): ScheduleBlock[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fixed: BlockType[] = ["prayer", "school", "sleep", "meal"];
  const todays = [...blocks].sort((a, b) => a.start - b.start);

  const missed = todays.filter(
    (b) => !fixed.includes(b.type) && b.status === "planned" && b.end < nowMin
  );
  if (!missed.length) return blocks;

  const keep = todays.filter((b) => !missed.includes(b));
  let free: FreeSlot[] = [{ start: nowMin + 5, end: 23 * 60 }];
  for (const b of keep) if (b.end > nowMin) free = subtractBlock(free, b.start - 5, b.end + 5);
  free = free.filter((s) => s.end - s.start >= 25);

  const rescheduled: ScheduleBlock[] = [];
  outer: for (const m of missed) {
    const dur = Math.min(m.end - m.start, 90);
    for (let i = 0; i < free.length; i++) {
      const slot = free[i];
      if (slot.end - slot.start >= dur) {
        rescheduled.push({ ...m, start: slot.start, end: slot.start + dur, status: "planned" });
        free[i] = { start: slot.start + dur + 10, end: slot.end };
        continue outer;
      }
    }
    rescheduled.push({ ...m, status: "missed" }); // no room left today
  }

  return [...keep, ...rescheduled].sort((a, b) => a.start - b.start);
}

export const BLOCK_STYLES: Record<BlockType, { color: string; label: string }> = {
  prayer:    { color: "#0d9488", label: "Prayer" },
  deep_work: { color: "#059669", label: "Deep work" },
  gym:       { color: "#8b5cf6", label: "Gym" },
  boxing:    { color: "#f43f5e", label: "Boxing" },
  school:    { color: "#64748b", label: "School" },
  business:  { color: "#0284c7", label: "Business" },
  study:     { color: "#d97706", label: "Study" },
  sleep:     { color: "#3f3f46", label: "Sleep" },
  meal:      { color: "#a1a1aa", label: "Meal" },
  roadwork:  { color: "#e11d48", label: "Roadwork" },
  buffer:    { color: "#52525b", label: "Buffer" },
};
