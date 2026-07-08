"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid, todayKey } from "./utils";
import type { CalcMethodId, AsrMethod, PrayerName } from "./prayer-times";

// ── Types ─────────────────────────────────────────────────────────

export type Pillar = "wealth" | "business" | "boxing" | "law" | "fitness" | "islam" | "self";

export const PILLARS: Record<Pillar, { label: string; weight: number; color: string; badge: string }> = {
  wealth:   { label: "Wealth",   weight: 10, color: "#059669", badge: "bg-emerald-500/15 text-emerald-400" },
  business: { label: "Business", weight: 9,  color: "#0284c7", badge: "bg-sky-500/15 text-sky-400" },
  boxing:   { label: "Boxing",   weight: 8,  color: "#f43f5e", badge: "bg-rose-500/15 text-rose-400" },
  law:      { label: "Law",      weight: 8,  color: "#d97706", badge: "bg-amber-500/15 text-amber-400" },
  fitness:  { label: "Fitness",  weight: 7,  color: "#8b5cf6", badge: "bg-violet-500/15 text-violet-400" },
  islam:    { label: "Islam",    weight: 10, color: "#0d9488", badge: "bg-teal-500/15 text-teal-400" },
  self:     { label: "Self",     weight: 6,  color: "#e11d48", badge: "bg-pink-500/15 text-pink-400" },
};

export interface Task {
  id: string;
  title: string;
  notes?: string;
  pillar: Pillar;
  priority: "low" | "medium" | "high" | "critical";
  impact: number; // 1-10
  effortHours: number;
  deadline?: string; // YYYY-MM-DD
  recurrence?: "daily" | "weekly" | "";
  status: "todo" | "in_progress" | "done";
  parentId?: string;
  createdAt: string;
}

export type BlockType =
  | "prayer" | "deep_work" | "gym" | "boxing" | "school"
  | "business" | "study" | "sleep" | "meal" | "roadwork" | "buffer";

export interface ScheduleBlock {
  id: string;
  date: string;
  start: number; // minutes of day
  end: number;
  type: BlockType;
  title: string;
  taskId?: string;
  status: "planned" | "done" | "missed";
}

// Simple money tracking — just enough to see what's coming in vs going out.
export interface Transaction {
  id: string;
  amount: number;
  direction: "income" | "expense";
  category: string;
  date: string;
  notes?: string;
}

export interface Account { id: string; name: string; kind: "cash" | "bank" | "investment"; balance: number; }
export interface FinancialGoal { id: string; title: string; target: number; horizon: "monthly" | "quarterly" | "yearly"; }

// Career: Cypress College → UC transfer (ASSIST) → law school → patent law.
// This is the biggest single focus in the app.
export type ClassStatus = "planned" | "in_progress" | "done";
export interface TransferClass {
  id: string;
  name: string;
  cypressCourse: string;
  appliesTo: "CS" | "EE" | "Both" | "GE";
  status: ClassStatus;
}
export interface LsatScore { id: string; date: string; score: number; }
export interface Career {
  targetUC: string;
  major: "Computer Science" | "Electrical Engineering";
  gpa?: number;
  lsatTarget: number;
  lsatScores: LsatScore[];
  classes: TransferClass[];
}

export type PrayerStatus = "on_time" | "jamaah" | "late" | "missed";

export interface AgentLogEntry { id: string; time: string; agent: string; summary: string; }

export interface Profile {
  name: string;
  latitude: number;
  longitude: number;
  method: CalcMethodId;
  asrMethod: AsrMethod;
  ramadanMode: boolean;
  wakeWordEnabled: boolean;
}

// ── Store ───────────────────────────────────────────────────────────

export interface JarvisState {
  profile: Profile;
  tasks: Task[];
  blocks: ScheduleBlock[];
  transactions: Transaction[];
  accounts: Account[];
  goals: FinancialGoal[];
  career: Career;
  fightDate?: string; // boxing — fight-prep reminder only, no session logging
  targetWeight?: number;
  prayerLogs: Record<string, Partial<Record<PrayerName, PrayerStatus>>>; // by date
  agentLog: AgentLogEntry[];

  setProfile: (p: Partial<Profile>) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & Partial<Pick<Task, "status">>) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setBlocksForDate: (date: string, blocks: ScheduleBlock[]) => void;
  updateBlock: (id: string, patch: Partial<ScheduleBlock>) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  updateAccount: (id: string, balance: number) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  addGoal: (g: Omit<FinancialGoal, "id">) => void;
  deleteGoal: (id: string) => void;
  setCareer: (c: Partial<Career>) => void;
  updateClass: (id: string, status: ClassStatus) => void;
  addTransferClass: (c: Omit<TransferClass, "id">) => void;
  addLsatScore: (score: number) => void;
  setFightPrep: (fightDate?: string, targetWeight?: number) => void;
  logPrayer: (date: string, prayer: PrayerName, status: PrayerStatus) => void;
  logAgent: (agent: string, summary: string) => void;
}

const seedTasks: Task[] = [
  { id: uid(), title: "LSAT logic games — 45 min drill", pillar: "law", priority: "high", impact: 9, effortHours: 0.75, recurrence: "daily", status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "Read 20 pages (finance/law)", pillar: "self", priority: "medium", impact: 6, effortHours: 0.5, recurrence: "daily", status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "Check ASSIST for this term's articulation updates", pillar: "law", priority: "medium", impact: 7, effortHours: 0.5, recurrence: "weekly", status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "Weekly money review", pillar: "wealth", priority: "medium", impact: 8, effortHours: 0.5, recurrence: "weekly", status: "todo", createdAt: new Date().toISOString() },
];

// Cypress College → UC transfer checklist. Course numbers follow Cypress's
// catalog style but MUST be verified against assist.org for the chosen
// UC + major — the Career page links straight to ASSIST.
const seedClasses: TransferClass[] = [
  { id: uid(), name: "English Composition", cypressCourse: "ENGL 100 C", appliesTo: "GE", status: "planned" },
  { id: uid(), name: "Critical Thinking / Writing", cypressCourse: "ENGL 103 C", appliesTo: "GE", status: "planned" },
  { id: uid(), name: "Calculus I", cypressCourse: "MATH 150A C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Calculus II", cypressCourse: "MATH 150B C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Multivariable Calculus", cypressCourse: "MATH 250A C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Linear Algebra & Differential Equations", cypressCourse: "MATH 250B C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Physics: Mechanics (calc-based)", cypressCourse: "PHYS 221 C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Physics: Electricity & Magnetism", cypressCourse: "PHYS 222 C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Physics: Waves, Optics, Thermo", cypressCourse: "PHYS 223 C", appliesTo: "EE", status: "planned" },
  { id: uid(), name: "Intro Programming (C++)", cypressCourse: "CSCI 133 C", appliesTo: "Both", status: "planned" },
  { id: uid(), name: "Advanced C++ / OOP", cypressCourse: "CSCI 233 C", appliesTo: "CS", status: "planned" },
  { id: uid(), name: "Data Structures", cypressCourse: "CSCI 241 C", appliesTo: "CS", status: "planned" },
  { id: uid(), name: "Discrete Structures", cypressCourse: "verify on ASSIST", appliesTo: "CS", status: "planned" },
  { id: uid(), name: "General Chemistry (EE @ Davis)", cypressCourse: "CHEM 111A C", appliesTo: "EE", status: "planned" },
];

export const useJarvis = create<JarvisState>()(
  persist(
    (set) => ({
      profile: {
        name: "Commander",
        latitude: 40.7128,
        longitude: -74.006,
        method: "ISNA",
        asrMethod: "standard",
        ramadanMode: false,
        wakeWordEnabled: false,
      },
      tasks: seedTasks,
      blocks: [],
      transactions: [],
      accounts: [
        { id: uid(), name: "Checking", kind: "bank", balance: 0 },
        { id: uid(), name: "Savings", kind: "bank", balance: 0 },
      ],
      goals: [{ id: uid(), title: "Monthly income", target: 2000, horizon: "monthly" }],
      career: {
        targetUC: "UC Berkeley",
        major: "Computer Science",
        lsatTarget: 175,
        lsatScores: [],
        classes: seedClasses,
      },
      prayerLogs: {},
      agentLog: [],

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      addTask: (t) => {
        const task: Task = { status: "todo", ...t, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id && t.parentId !== id) })),

      setBlocksForDate: (date, blocks) =>
        set((s) => ({ blocks: [...s.blocks.filter((b) => b.date !== date), ...blocks] })),
      updateBlock: (id, patch) =>
        set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),

      addTransaction: (t) => set((s) => ({ transactions: [{ ...t, id: uid() }, ...s.transactions] })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      updateAccount: (id, balance) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, balance } : a)) })),
      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, { ...a, id: uid() }] })),
      addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: uid() }] })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      setCareer: (c) => set((s) => ({ career: { ...s.career, ...c } })),
      updateClass: (id, status) =>
        set((s) => ({ career: { ...s.career, classes: s.career.classes.map((c) => (c.id === id ? { ...c, status } : c)) } })),
      addTransferClass: (c) =>
        set((s) => ({ career: { ...s.career, classes: [...s.career.classes, { ...c, id: uid() }] } })),
      addLsatScore: (score) =>
        set((s) => ({
          career: { ...s.career, lsatScores: [...s.career.lsatScores, { id: uid(), date: todayKey(), score }] },
        })),

      setFightPrep: (fightDate, targetWeight) => set(() => ({ fightDate, targetWeight })),

      logPrayer: (date, prayer, status) =>
        set((s) => ({
          prayerLogs: { ...s.prayerLogs, [date]: { ...s.prayerLogs[date], [prayer]: status } },
        })),

      logAgent: (agent, summary) =>
        set((s) => ({
          agentLog: [{ id: uid(), time: new Date().toISOString(), agent, summary }, ...s.agentLog].slice(0, 200),
        })),
    }),
    { name: "jarvis-os" }
  )
);

// ── Derived helpers ─────────────────────────────────────────────────

export function roiScore(t: Task): number {
  const weight = PILLARS[t.pillar].weight;
  const daysLeft = t.deadline
    ? Math.max(0.5, (new Date(t.deadline).getTime() - Date.now()) / 86400000)
    : 7;
  const urgency = Math.min(2, 1 + 3 / daysLeft);
  return Math.round(((t.impact * weight * urgency) / Math.max(0.25, t.effortHours)) * 10) / 10;
}

export function financeSummary(transactions: Transaction[], month = todayKey().slice(0, 7)) {
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  const revenue = inMonth.filter((t) => t.direction === "income").reduce((a, t) => a + t.amount, 0);
  const expenses = inMonth.filter((t) => t.direction === "expense").reduce((a, t) => a + t.amount, 0);
  return { revenue, expenses, profit: revenue - expenses };
}

export function prayerStreak(prayerLogs: JarvisState["prayerLogs"]): number {
  let streak = 0;
  const d = new Date();
  // today counts if all logged prayers so far are non-missed and at least one logged
  for (let i = 0; i < 365; i++) {
    const key = todayKey(d);
    const log = prayerLogs[key];
    const entries = log ? Object.values(log) : [];
    const complete = entries.length === 5 && entries.every((s) => s !== "missed");
    if (i === 0 && !complete) {
      // today may be in progress — skip without breaking
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (complete) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}
