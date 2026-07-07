// Tool registry shared by the server (schema definitions sent to Claude)
// and the client (executor in jarvis-executor.ts). Pure data — no imports
// of client-only modules.

export const JARVIS_SYSTEM_PROMPT = `You are JARVIS, the user's personal AI operating system — CEO, operator, and hands on his computer.

MONEY IS THE MISSION. Priorities in order: (1) making money — TikTok Shop, Etsy, the POD automation engine, (2) controlling his PC so he can work by voice, (3) becoming a lawyer, (4) training. Everything you say and schedule should bias toward income.

Fixed facts about his life:
- The five daily prayers are non-negotiable anchors — never schedule over them; plan around them. Prayer is the only religious tracking he wants; do not bring up Qur'an goals, dhikr, or other religious practice.
- Boxing days are Monday, Tuesday, Wednesday, Friday, Saturday. He just shows up — never tell him what to train, what combos to hit, or how to box. Never log boxing.
- Lifting is every day. Don't prescribe exercises or programs unless he explicitly asks.

Operating rules:
- Think, then act. Use tools to read his real data before answering questions about it.
- Desktop tools control his actual PC through the local bridge: open apps, open sites, search, volume, media, type, screenshot, lock. Use them freely for voice commands like "open Chrome".
- The POD engine tools trigger his real print-on-demand automation (pipeline, order sync, analytics sync, optimization). Running the pipeline costs API money — do it when he asks, and report the result.
- Advertising stack: per-channel budgets with hard over-spend blocks (log_ad_spend), UGC video ads generated with Higgsfield (draft_ugc_ad — write scripts yourself, punchy and native), and a UGC creator affiliate pipeline (add_ugc_creator / get_affiliate_summary). ROAS below 1 means ads are losing money — flag it.
- Execute low-risk actions directly. Anything irreversible — publishing, purchasing, deleting, sending — describe it and get his confirmation first.
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
    name: "get_bills_summary",
    description: "Monthly business expenses: total needed, paid, still due, overdue bills, bank balance, and whether it's fully funded. NOTE: you can see and plan bills but you can NEVER execute a payment — only he can approve payments, on the Bills page.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_bill",
    description: "Register a recurring monthly business expense on the bills whitelist.",
    input_schema: {
      type: "object",
      properties: {
        name: str("Bill name, e.g. 'Printify Premium'"),
        amount: num("Monthly amount in dollars"),
        dueDay: num("Day of month it's due (1-28)"),
        category: str("Category, e.g. software, fees"),
      },
      required: ["name", "amount"],
    },
  },
  {
    name: "get_ad_budget_summary",
    description: "Advertising budgets per channel, spend this month, remaining, ROAS, and the full monthly operating cost (bills + ad budgets).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "log_ad_spend",
    description: "Log advertising spend against a channel budget. BLOCKED automatically if it would exceed the channel's monthly budget.",
    input_schema: {
      type: "object",
      properties: {
        channel: str("Channel name, e.g. 'TikTok Ads', 'Etsy Ads'"),
        amount: num("Amount spent in dollars"),
        note: str("Optional campaign/product note"),
      },
      required: ["channel", "amount"],
    },
  },
  {
    name: "get_finance_summary",
    description: "Get this month's revenue, expenses, profit, income by source, and net worth.",
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
        category: str("Category, e.g. 'TikTok Shop sales', 'supplies'"),
        source: { type: "string", enum: ["tiktok", "etsy", "other"] },
        notes: str("Optional note"),
      },
      required: ["amount", "direction", "category"],
    },
  },
  {
    name: "log_workout",
    description: "Log a gym workout with sets.",
    input_schema: {
      type: "object",
      properties: {
        name: str("Workout name, e.g. 'Push day'"),
        sets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              exercise: str("Exercise name"),
              muscleGroup: str("Muscle group"),
              reps: num("Reps"),
              weight: num("Weight in lbs"),
            },
            required: ["exercise", "reps", "weight"],
          },
        },
      },
      required: ["name", "sets"],
    },
  },
  {
    name: "log_health",
    description: "Log daily health metrics (any subset).",
    input_schema: {
      type: "object",
      properties: {
        calories: num("Calories eaten"),
        protein: num("Protein grams"),
        waterMl: num("Water in ml"),
        sleepHours: num("Hours slept"),
        weight: num("Body weight lbs"),
        mood: num("Mood 1-10"),
        energy: num("Energy 1-10"),
      },
    },
  },
  {
    name: "add_product_idea",
    description: "Add a product to the TikTok Shop or Etsy research pipeline.",
    input_schema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["tiktok", "etsy"] },
        name: str("Product name/idea"),
        notes: str("Why it could win"),
      },
      required: ["platform", "name"],
    },
  },
  {
    name: "draft_ugc_ad",
    description: "Write a UGC video-ad brief (hook, 30s script with timestamps, caption), save it to the content calendar, and open Higgsfield (AI UGC video generator) with the script on the clipboard. Write the script yourself — punchy, native TikTok style.",
    input_schema: {
      type: "object",
      properties: {
        product: str("Product being advertised"),
        hook: str("First-3-seconds hook line"),
        script: str("Full 30s UGC script with timestamps (0-3s hook, 3-10s reveal, 10-20s proof, 20-27s CTA)"),
        caption: str("Caption with hashtags"),
      },
      required: ["product", "hook", "script"],
    },
  },
  {
    name: "add_ugc_creator",
    description: "Add a UGC creator/affiliate to the outreach pipeline (starts as prospect).",
    input_schema: {
      type: "object",
      properties: {
        handle: str("@handle"),
        platform: { type: "string", enum: ["tiktok", "instagram", "youtube"] },
        commissionPct: num("Affiliate commission percent (default 15)"),
      },
      required: ["handle"],
    },
  },
  {
    name: "get_affiliate_summary",
    description: "UGC creator affiliate program status: active creators, pipeline, attributed GMV, commissions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_content_idea",
    description: "Add a TikTok content idea (hook + script + caption) to the calendar.",
    input_schema: {
      type: "object",
      properties: {
        hook: str("The first-3-seconds hook"),
        script: str("Short video script"),
        caption: str("Caption with hashtags"),
      },
      required: ["hook"],
    },
  },
  {
    name: "add_etsy_listing_draft",
    description: "Draft an Etsy listing (title, description, up to 13 SEO tags) into the queue.",
    input_schema: {
      type: "object",
      properties: {
        title: str("SEO-optimized listing title (~130 chars)"),
        description: str("Listing description"),
        tags: { type: "array", items: { type: "string" }, description: "Up to 13 SEO tags" },
        price: num("Suggested price"),
      },
      required: ["title"],
    },
  },
  {
    name: "get_life_dashboard",
    description: "Snapshot of everything: finances, tasks, prayer streak, health readiness, training volume. Use for briefings and 'how am I doing' questions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "open_url",
    description: "Open a website. Uses the desktop bridge (his real default browser) when available, otherwise a new tab.",
    input_schema: { type: "object", properties: { url: str("Full URL, https://...") }, required: ["url"] },
  },
  {
    name: "tiktok_product_search",
    description: "Product research engine: opens TikTok Creative Center top products, TikTok Shop search, and Google Trends for a niche/keyword, and logs the search. Use whenever he wants to find winning products.",
    input_schema: { type: "object", properties: { query: str("Niche or product keyword, e.g. 'ring light', 'gym accessories'") }, required: ["query"] },
  },
  // ── Desktop control (local bridge on his PC) ──────────────────────
  {
    name: "desktop_open_app",
    description: "Open an application on his PC: chrome, vs code, spotify, terminal, notepad, calculator, word, excel, explorer/finder, etc.",
    input_schema: { type: "object", properties: { app: str("App name") }, required: ["app"] },
  },
  {
    name: "desktop_search",
    description: "Google-search in his real default browser via the desktop bridge.",
    input_schema: { type: "object", properties: { query: str("Search query") }, required: ["query"] },
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
  // ── POD automation engine (Alsaduquon) ────────────────────────────
  {
    name: "pod_engine_status",
    description: "Check whether his POD automation engine is online and configured.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "pod_engine_action",
    description: "Trigger the POD automation engine: run_pipeline (generate + list new products — costs API money), sync_orders, sync_analytics, or optimize (listing optimization).",
    input_schema: {
      type: "object",
      properties: { action: { type: "string", enum: ["run_pipeline", "sync_orders", "sync_analytics", "optimize"] } },
      required: ["action"],
    },
  },
];
