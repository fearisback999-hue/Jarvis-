"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid, todayKey } from "./utils";
import type { CalcMethodId, AsrMethod, PrayerName } from "./prayer-times";

// ── Types (mirror prisma/schema.prisma) ─────────────────────────────

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

export interface Transaction {
  id: string;
  amount: number;
  direction: "income" | "expense";
  category: string;
  source: "tiktok" | "etsy" | "other";
  date: string;
  notes?: string;
}

export interface Account { id: string; name: string; kind: "cash" | "bank" | "investment"; balance: number; }
export interface FinancialGoal { id: string; title: string; target: number; horizon: "monthly" | "quarterly" | "yearly"; }

export interface Product {
  id: string;
  platform: "tiktok" | "etsy";
  name: string;
  status: "research" | "testing" | "winning" | "killed" | "live";
  cost?: number;
  price?: number;
  notes?: string;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  price?: number;
  state: "draft" | "queued" | "published";
}

export interface ContentItem {
  id: string;
  hook: string;
  script?: string;
  caption?: string;
  postDate?: string;
  posted: boolean;
  views: number;
  sales: number;
}

export type BoxingType = "bag" | "pads" | "sparring" | "conditioning" | "roadwork" | "technique" | "defense";
export interface BoxingSession {
  id: string;
  date: string;
  type: BoxingType;
  minutes: number;
  rounds?: number;
  intensity: number; // 1-10
  notes?: string;
}

export const BOXING_SKILLS = [
  "jab", "cross", "hooks", "uppercuts", "footwork",
  "head movement", "defense", "ring IQ", "conditioning",
] as const;
export type BoxingSkill = (typeof BOXING_SKILLS)[number];

export interface WorkoutSet { exercise: string; muscleGroup: string; reps: number; weight: number; }
export interface Workout { id: string; date: string; name: string; sets: WorkoutSet[]; notes?: string; }

export interface HealthLog {
  calories?: number; protein?: number; waterMl?: number;
  sleepHours?: number; weight?: number;
  mood?: number; stress?: number; energy?: number; // 1-10
}

export type PrayerStatus = "on_time" | "jamaah" | "late" | "missed";
export interface QuranLog { id: string; date: string; reference: string; pages: number; }
export interface DhikrLog { id: string; date: string; kind: string; count: number; }

export type LawPhase = "high_school" | "college" | "lsat" | "applications" | "law_school" | "bar";
export interface LawMilestone {
  id: string;
  phase: LawPhase;
  title: string;
  targetDate?: string;
  status: "upcoming" | "active" | "done";
}

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
  products: Product[];
  listings: Listing[];
  content: ContentItem[];
  boxingSessions: BoxingSession[];
  skills: Record<BoxingSkill, number>;
  fightDate?: string;
  targetWeight?: number;
  workouts: Workout[];
  health: Record<string, HealthLog>; // by date
  prayerLogs: Record<string, Partial<Record<PrayerName, PrayerStatus>>>; // by date
  quranLogs: QuranLog[];
  dhikrLogs: DhikrLog[];
  duas: { id: string; text: string }[];
  lawMilestones: LawMilestone[];
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
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addListing: (l: Omit<Listing, "id">) => void;
  updateListing: (id: string, patch: Partial<Listing>) => void;
  deleteListing: (id: string) => void;
  addContent: (c: Omit<ContentItem, "id">) => void;
  updateContent: (id: string, patch: Partial<ContentItem>) => void;
  addBoxingSession: (s: Omit<BoxingSession, "id">) => void;
  setSkill: (skill: BoxingSkill, rating: number) => void;
  setFightPrep: (fightDate?: string, targetWeight?: number) => void;
  addWorkout: (w: Omit<Workout, "id">) => void;
  deleteWorkout: (id: string) => void;
  logHealth: (date: string, patch: Partial<HealthLog>) => void;
  logPrayer: (date: string, prayer: PrayerName, status: PrayerStatus) => void;
  addQuranLog: (l: Omit<QuranLog, "id">) => void;
  addDhikr: (date: string, kind: string, count: number) => void;
  addDua: (text: string) => void;
  deleteDua: (id: string) => void;
  updateMilestone: (id: string, patch: Partial<LawMilestone>) => void;
  addMilestone: (m: Omit<LawMilestone, "id">) => void;
  logAgent: (agent: string, summary: string) => void;
}

const seedTasks: Task[] = [
  { id: uid(), title: "Film 3 TikTok product videos", pillar: "business", priority: "high", impact: 9, effortHours: 2, status: "todo", recurrence: "daily", createdAt: new Date().toISOString() },
  { id: uid(), title: "Draft 5 Etsy listings for the queue", pillar: "business", priority: "high", impact: 8, effortHours: 1.5, status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "LSAT logic games — 45 min drill", pillar: "law", priority: "high", impact: 8, effortHours: 0.75, recurrence: "daily", status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "Read 20 pages (finance/law)", pillar: "self", priority: "medium", impact: 6, effortHours: 0.5, recurrence: "daily", status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "Weekly money review", pillar: "wealth", priority: "medium", impact: 8, effortHours: 0.5, recurrence: "weekly", status: "todo", createdAt: new Date().toISOString() },
  { id: uid(), title: "Research 10 winning TikTok Shop products", pillar: "business", priority: "medium", impact: 7, effortHours: 1, status: "todo", createdAt: new Date().toISOString() },
];

const seedMilestones: LawMilestone[] = [
  { id: uid(), phase: "high_school", title: "Maintain top GPA + join debate/mock trial", status: "active" },
  { id: uid(), phase: "high_school", title: "Build daily reading & writing habit", status: "active" },
  { id: uid(), phase: "college", title: "Choose pre-law-friendly major (philosophy / poli-sci / econ)", status: "upcoming" },
  { id: uid(), phase: "college", title: "Internship at a law firm or legal clinic", status: "upcoming" },
  { id: uid(), phase: "lsat", title: "First LSAT diagnostic test", status: "upcoming" },
  { id: uid(), phase: "lsat", title: "Score 165+ on a timed practice test", status: "upcoming" },
  { id: uid(), phase: "applications", title: "Research scholarships & write personal statement", status: "upcoming" },
  { id: uid(), phase: "applications", title: "Apply to target law schools", status: "upcoming" },
  { id: uid(), phase: "law_school", title: "1L year — make law review", status: "upcoming" },
  { id: uid(), phase: "bar", title: "Pass the bar exam", status: "upcoming" },
];

const defaultSkills = Object.fromEntries(BOXING_SKILLS.map((s) => [s, 5])) as Record<BoxingSkill, number>;

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
      goals: [{ id: uid(), title: "Monthly revenue", target: 2000, horizon: "monthly" }],
      products: [],
      listings: [],
      content: [],
      boxingSessions: [],
      skills: defaultSkills,
      workouts: [],
      health: {},
      prayerLogs: {},
      quranLogs: [],
      dhikrLogs: [],
      duas: [{ id: uid(), text: "Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina 'adhab an-nar" }],
      lawMilestones: seedMilestones,
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

      addProduct: (p) => set((s) => ({ products: [{ ...p, id: uid() }, ...s.products] })),
      updateProduct: (id, patch) =>
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      addListing: (l) => set((s) => ({ listings: [{ ...l, id: uid() }, ...s.listings] })),
      updateListing: (id, patch) =>
        set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteListing: (id) => set((s) => ({ listings: s.listings.filter((l) => l.id !== id) })),

      addContent: (c) => set((s) => ({ content: [{ ...c, id: uid() }, ...s.content] })),
      updateContent: (id, patch) =>
        set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      addBoxingSession: (bs) => set((s) => ({ boxingSessions: [{ ...bs, id: uid() }, ...s.boxingSessions] })),
      setSkill: (skill, rating) => set((s) => ({ skills: { ...s.skills, [skill]: rating } })),
      setFightPrep: (fightDate, targetWeight) => set(() => ({ fightDate, targetWeight })),

      addWorkout: (w) => set((s) => ({ workouts: [{ ...w, id: uid() }, ...s.workouts] })),
      deleteWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      logHealth: (date, patch) =>
        set((s) => ({ health: { ...s.health, [date]: { ...s.health[date], ...patch } } })),

      logPrayer: (date, prayer, status) =>
        set((s) => ({
          prayerLogs: { ...s.prayerLogs, [date]: { ...s.prayerLogs[date], [prayer]: status } },
        })),
      addQuranLog: (l) => set((s) => ({ quranLogs: [{ ...l, id: uid() }, ...s.quranLogs] })),
      addDhikr: (date, kind, count) =>
        set((s) => ({ dhikrLogs: [{ id: uid(), date, kind, count }, ...s.dhikrLogs] })),
      addDua: (text) => set((s) => ({ duas: [...s.duas, { id: uid(), text }] })),
      deleteDua: (id) => set((s) => ({ duas: s.duas.filter((d) => d.id !== id) })),

      updateMilestone: (id, patch) =>
        set((s) => ({ lawMilestones: s.lawMilestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      addMilestone: (m) => set((s) => ({ lawMilestones: [...s.lawMilestones, { ...m, id: uid() }] })),

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

export function readinessScore(h: HealthLog | undefined): number | null {
  if (!h) return null;
  const parts: number[] = [];
  if (h.sleepHours != null) parts.push(Math.min(1, h.sleepHours / 8));
  if (h.energy != null) parts.push(h.energy / 10);
  if (h.mood != null) parts.push(h.mood / 10);
  if (h.stress != null) parts.push(1 - h.stress / 10);
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

export function financeSummary(transactions: Transaction[], month = todayKey().slice(0, 7)) {
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  const revenue = inMonth.filter((t) => t.direction === "income").reduce((a, t) => a + t.amount, 0);
  const expenses = inMonth.filter((t) => t.direction === "expense").reduce((a, t) => a + t.amount, 0);
  const bySource = { tiktok: 0, etsy: 0, other: 0 };
  for (const t of inMonth) if (t.direction === "income") bySource[t.source] += t.amount;
  return { revenue, expenses, profit: revenue - expenses, bySource };
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
