// Tool registry shared by the server (schema definitions sent to Claude)
// and the client (executor in jarvis-executor.ts). Pure data — no imports
// of client-only modules.

export const JARVIS_SYSTEM_PROMPT = `You are JARVIS, the user's personal AI operating system — his hands on his computer and his chief of staff.

Your star capability is controlling his PC by voice: open any app or site and act on it in one shot — "open TikTok and look up boxing videos" means actually open TikTok AND perform that search, not just launch the app. Use the desktop tools freely and confidently for this; it's the thing he relies on you for most.

Priorities in order: (1) desktop control — do what he asks on his machine, (2) his career path — Cypress College to a UC transfer to a CS/EE degree to a 175-180 LSAT to Harvard or Yale Law to becoming a patent attorney. Treat this as a big, active part of his life, not a side note. (3) keeping his day planned around fixed prayer times with his highest-ROI tasks, (4) simple money awareness.

Fixed facts about his life:
- The five daily prayers are non-negotiable anchors — never schedule over them; plan around them. Prayer is the only religious tracking he wants.
- Boxing days are Monday, Tuesday, Wednesday, Friday, Saturday. Lifting is every day. Both are reminders only — he just shows up. Never log a session, never prescribe exercises, combos, or programs, never coach him on either unless he explicitly asks something specific.
- His businesses (TikTok Shop, POD, Etsy, advertising) are run entirely outside this app, by him, using their own platforms. Don't track them, suggest them, or offer to help with them — that's out of scope for you.
- Money tracking here is deliberately simple: what he's spending and what he's making, nothing more. No bills, no budgets, no ad spend.

Operating rules:
- Think, then act. Use tools to read his real data before answering questions about it.
- Execute low-risk actions directly. Anything irreversible — deleting, sending, purchasing — describe it and get his confirmation first.
- Be concise and direct, like a sharp chief of staff. Lead with the action taken or the number he asked for.
- Speak naturally — replies may be read aloud by text-to-speech, so keep them tight.`;

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });

export const JARVIS_TOOLS: ToolDef[] = [
  {
    name: "create_task",
    description: "Create a task. Use for anything the user wants to do or track.",
    input_schema: {
      type: "object",
      properties: {
        title: str("Task title"),
        pillar: { type: "string", enum: ["wealth", "business", "boxing", "law", "fitness", "islam", "self"] },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        impact: num("Impact 1-10"),
        effortHours: num("Estimated hours of effort"),
        deadline: str("Optional deadline YYYY-MM-DD"),
      },
      required: ["title", "pillar"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task done by fuzzy title match.",
    input_schema: { type: "object", properties: { title: str("Title or part of it") }, required: ["title"] },
  },
  {
    name: "list_tasks",
    description: "List open tasks ranked by ROI score.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_schedule",
    description: "Get today's schedule blocks (prayers, work, gym, etc).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "generate_schedule",
    description: "Regenerate today's plan around prayer times, filling free slots with highest-ROI tasks.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "move_block",
    description: "Move a schedule block to a new start time today.",
    input_schema: {
      type: "object",
      properties: { title: str("Block title or part of it"), newStart: str("New start time HH:mm (24h)") },
      required: ["title", "newStart"],
    },
  },
  {
    name: "get_prayer_times",
    description: "Get today's prayer times and the next prayer countdown.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "log_prayer",
    description: "Log a prayer for today.",
    input_schema: {
      type: "object",
      properties: {
        prayer: { type: "string", enum: ["fajr", "dhuhr", "asr", "maghrib", "isha"] },
        status: { type: "string", enum: ["on_time", "jamaah", "late", "missed"] },
      },
      required: ["prayer", "status"],
    },
  },
  {
    name: "get_career_status",
    description: "His law/patent-attorney career path: target UC, major, ASSIST transfer class checklist progress, LSAT scores and target, current GPA.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "log_lsat_score",
    description: "Log a new LSAT practice test score.",
    input_schema: {
      type: "object",
      properties: {
        score: num("LSAT score, 120-180"),
        date: str("Optional date YYYY-MM-DD, defaults to today"),
        notes: str("Optional note, e.g. which section was weakest"),
      },
      required: ["score"],
    },
  },
  {
    name: "update_transfer_class",
    description: "Update the status of a class on his Cypress College → UC transfer checklist by fuzzy name match.",
    input_schema: {
      type: "object",
      properties: {
        name: str("Class name or part of it, e.g. 'Calculus 1'"),
        status: { type: "string", enum: ["planned", "in_progress", "done"] },
      },
      required: ["name", "status"],
    },
  },
  {
    name: "get_finance_summary",
    description: "Get this month's revenue, expenses, and profit.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_transaction",
    description: "Record income or an expense.",
    input_schema: {
      type: "object",
      properties: {
        amount: num("Amount in dollars"),
        direction: { type: "string", enum: ["income", "expense"] },
        category: str("Category, e.g. 'sales', 'groceries', 'gas'"),
        notes: str("Optional note"),
      },
      required: ["amount", "direction", "category"],
    },
  },
  {
    name: "get_life_dashboard",
    description: "Snapshot of everything: finances, tasks, prayer streak, career progress. Use for briefings and 'how am I doing' questions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "open_url",
    description: "Open a website. Uses the desktop bridge (his real default browser) when available, otherwise a new tab.",
    input_schema: { type: "object", properties: { url: str("Full URL, https://...") }, required: ["url"] },
  },
  // ── Desktop control (local bridge on his PC) ──────────────────────
  {
    name: "desktop_open_app",
    description: "Open an application on his PC: chrome, vs code, spotify, terminal, notepad, calculator, word, excel, explorer/finder, etc.",
    input_schema: { type: "object", properties: { app: str("App name") }, required: ["app"] },
  },
  {
    name: "desktop_open_and_search",
    description:
      "Open a site (or app) and immediately search it for something, in one action — e.g. 'open TikTok and look up boxing videos', 'search Amazon for hand wraps', 'find gym accessories on Etsy'. This is the go-to tool whenever he wants to look something up on a specific platform.",
    input_schema: {
      type: "object",
      properties: {
        site: str("Site/app name, e.g. 'tiktok', 'youtube', 'google', 'amazon', 'instagram', 'github', 'reddit', 'spotify', 'twitter'"),
        query: str("What to search for"),
      },
      required: ["site", "query"],
    },
  },
  {
    name: "desktop_volume",
    description: "Control system volume on his PC.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["up", "down", "mute", "set"] },
        level: num("0-100, only for action=set"),
      },
      required: ["action"],
    },
  },
  {
    name: "desktop_media",
    description: "Media control on his PC: play/pause, next or previous track.",
    input_schema: {
      type: "object",
      properties: { action: { type: "string", enum: ["playpause", "next", "prev"] } },
      required: ["action"],
    },
  },
  {
    name: "desktop_type",
    description: "Type text into whatever window is focused on his PC.",
    input_schema: { type: "object", properties: { text: str("Text to type (max 500 chars)") }, required: ["text"] },
  },
  {
    name: "desktop_screenshot",
    description: "Take a screenshot on his PC (saved to his Desktop).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "desktop_lock",
    description: "Lock his PC.",
    input_schema: { type: "object", properties: {} },
  },
];
