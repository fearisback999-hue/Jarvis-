# 01 — Overall Software Architecture

JARVIS is a layered system: a premium web app (the cockpit), an AI brain (agent swarm with tool use), a data layer (local-first, cloud-synced), a desktop bridge (OS control), and an automation layer (browser + scheduled jobs).

## System overview

```mermaid
flowchart TB
    subgraph Clients
        WEB[Next.js 15 Web App<br/>Command Center + Modules]
        VOICE[Voice Mode<br/>Wake phrase · STT · TTS]
        DESK[Desktop Companion<br/>Tauri shell + OS bridge]
    end

    subgraph Brain[AI Brain]
        ORCH[Orchestrator / CEO Agent]
        AGENTS[Specialist Agents<br/>Finance · TikTok · Etsy · Boxing<br/>Gym · Nutrition · Law · Prayer · Scheduler]
        TOOLS[Tool Registry<br/>tasks · finance · schedule · workouts<br/>prayer · research · desktop · browser]
    end

    subgraph Data
        LOCAL[(Local store<br/>Zustand + localStorage)]
        PG[(PostgreSQL<br/>Supabase + Prisma)]
    end

    subgraph Automation
        PW[Playwright Workers]
        JOBS[Scheduled Jobs<br/>briefings · reviews · research]
        EXT[External APIs<br/>Printify · Etsy · Google Calendar]
    end

    WEB --> ORCH
    VOICE --> WEB
    DESK -->|WebSocket localhost| WEB
    ORCH --> AGENTS --> TOOLS
    TOOLS --> LOCAL
    LOCAL <-->|sync| PG
    TOOLS --> DESK
    TOOLS --> PW
    JOBS --> ORCH
    PW --> EXT
```

## Layers

### 1. Presentation — the cockpit
- **Next.js 15 App Router**, React 19, TypeScript, Tailwind v4, Framer Motion, Recharts.
- One shell layout: keyboard-first sidebar, dark-mode-first, Linear/Raycast-grade minimalism.
- Every life pillar is a module route (`/money`, `/boxing`, `/islam`, …) sharing one design system.

### 2. AI Brain — the operator
- `/api/jarvis` runs an **agentic tool-use loop** against Claude (falls back to a deterministic local planner when no API key is configured).
- The model decides which tools to call; **tool execution happens client-side** against the user's own data store, then results are fed back to the model. The server never holds personal data.
- The Orchestrator routes intent to specialist agents (see `03-agent-architecture.md`).

```mermaid
sequenceDiagram
    participant U as User (text/voice)
    participant C as Client (tool executor)
    participant S as /api/jarvis
    participant M as Claude

    U->>C: "Move today's workout to 6 PM"
    C->>S: messages + context snapshot
    S->>M: system prompt + tools + messages
    M-->>S: tool_use: update_schedule_block
    S-->>C: tool call
    C->>C: execute against local store
    C->>S: tool_result
    S->>M: continue
    M-->>S: final answer
    S-->>C: answer
    C-->>U: text + TTS
```

### 3. Data — local-first, cloud-ready
- **Today**: a single typed Zustand store persisted to localStorage. Zero setup, instant, private.
- **Production sync**: Prisma schema (`prisma/schema.prisma`) targeting Supabase PostgreSQL with row-level security; the store becomes a write-through cache with background sync and offline queue.

### 4. Desktop bridge — hands on the machine
- Tauri companion app exposes a **capability-scoped localhost WebSocket** (`ws://127.0.0.1:8377`).
- Commands: open/close apps, browse, screenshot, read screen (OCR/accessibility tree), mouse/keyboard, files, media, volume.
- Every command is tiered by risk; irreversible ones require confirmation. Details in `04-desktop-architecture.md`.

### 5. Automation — the workhorses
- Playwright workers for browser automation (research, form-filling, data extraction).
- Scheduled jobs (cron via Trigger.dev/n8n or local scheduler): morning briefing, nightly summary, weekly review, trend research, listing drafts.
- Native API integrations preferred over automation wherever they exist (Etsy, Printify, Google Calendar). Details in `05-automation-architecture.md`.

## The ROI engine

The heart of JARVIS. Every task, block, and suggestion carries a computed **ROI score**:

```
score = (impact × pillarWeight × urgency) / effortHours
```

- `pillarWeight` reflects the user's fixed priority order (wealth 10, business 9, boxing 8, law 8, fitness 7, islam 10*, self-improvement 6). *Prayers are non-negotiable anchors, not scored tasks — the scheduler plans around them.
- The scheduler fills the day highest-score-first into free blocks between anchors (prayers, school, sleep).
- Missed blocks automatically reflow to the next free slot.

## Non-functional requirements

| Concern | Approach |
|---|---|
| Privacy | Local-first data; server is a stateless LLM proxy; keys in env only |
| Latency | Optimistic UI, client-side tools, streaming responses |
| Reliability | App fully functional offline except LLM chat |
| Safety | Risk-tiered actions; confirmation gates on irreversible operations |
| Extensibility | New module = store slice + tool definitions + route |
