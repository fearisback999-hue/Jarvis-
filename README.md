# JARVIS — Personal AI Operating System

> Not a productivity app. Not a to-do list. Not a chatbot.
> An always-on AI operating system that acts as your CEO, executive assistant, operator, researcher, scheduler, coach, and automation engine.

JARVIS optimizes life across seven pillars, in priority order:

1. **Wealth** — financial freedom, business growth
2. **Business** — TikTok Shop, Etsy automation
3. **Boxing** — training, fight prep, performance
4. **Law** — the roadmap to becoming a lawyer
5. **Fitness & Health** — gym, nutrition, recovery
6. **Islam** — prayer, Qur'an, dhikr, consistency
7. **Self-improvement** — discipline, habits, learning

The core question JARVIS constantly asks: **"What action creates the highest return on investment for his time right now?"**

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app runs fully offline with local persistence — no accounts, keys, or services required.

To enable the full AI brain (agentic chat with tool use), add an Anthropic API key:

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY=sk-ant-...
```

Voice mode ("Hey Jarvis" wake phrase, speech-to-text, text-to-speech) works in Chromium-based browsers via the Web Speech API — enable it from the JARVIS page.

## What's inside

| Module | Route | What it does |
|---|---|---|
| Command Center | `/` | Money snapshot, highest-ROI tasks, prayer countdown, today at a glance |
| JARVIS | `/jarvis` | Agentic chat + voice mode; controls the PC, the POD engine, money, schedule |
| Money OS | `/money` | Revenue, profit, expenses, net worth, cash flow, goals |
| POD Automation | `/business/pod` | Triggers your NEO POD engine (Alsaduquon): pipeline, order sync, analytics, optimize |
| TikTok Shop | `/business/tiktok` | Product Search Engine + product pipeline + content calendar |
| Etsy | `/business/etsy` | Listings pipeline, SEO/keywords, publishing queue, profit |
| Boxing | `/boxing` | Training days only: Mon · Tue · Wed · Fri · Sat + fight countdown |
| Gym | `/gym` | Lifting every day — sets/reps/weight, PRs, weekly volume |
| Health | `/health` | Calories, protein, water, sleep, weight, daily readiness score |
| Law | `/law` | Milestone roadmap: high school → LSAT → law school → bar |
| Prayer | `/prayer` | Real prayer-time calculation, countdown, logging, streak |
| Schedule | `/schedule` | Day plan around prayer anchors; lifting daily, boxing on boxing days |
| Tasks | `/tasks` | Priorities, deadlines, subtasks, ROI scoring |
| Settings | `/settings` | Desktop bridge pairing, location, prayer method, data export |

## Desktop control ("Hey Jarvis, open Chrome")

Run the bridge on your PC — it's a single zero-dependency script:

```bash
node desktop-bridge/bridge.mjs
```

It prints a pairing token; paste it into **Settings → Desktop bridge**. JARVIS can then open apps, search Google in your real browser, control volume and media, type, take screenshots, and lock the machine — by text or voice. The bridge listens on `127.0.0.1` only.

## POD engine

The [`Alsaduquon`](https://github.com/fearisback999-hue/Alsaduquon) POD automation engine plugs in via `.env.local` (`POD_ENGINE_URL` + `POD_CRON_SECRET`). JARVIS can run the pipeline, sync orders, sync analytics, and optimize listings — from the POD page or by voice.

## Documentation

- [`docs/01-architecture.md`](docs/01-architecture.md) — overall software architecture + system diagrams
- [`docs/02-database-schema.md`](docs/02-database-schema.md) — data model (see also [`prisma/schema.prisma`](prisma/schema.prisma))
- [`docs/03-agent-architecture.md`](docs/03-agent-architecture.md) — the agent swarm and orchestration loop
- [`docs/04-desktop-architecture.md`](docs/04-desktop-architecture.md) — desktop control bridge (Tauri companion)
- [`docs/05-automation-architecture.md`](docs/05-automation-architecture.md) — browser/web automation & scheduled jobs
- [`docs/06-ui-ux.md`](docs/06-ui-ux.md) — design system and screen mockups
- [`docs/07-roadmap.md`](docs/07-roadmap.md) — implementation roadmap and current status

## Architecture at a glance

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Recharts
- **State/persistence**: Zustand with localStorage persistence today; Prisma + Supabase (PostgreSQL) schema ready for cloud sync (`prisma/schema.prisma`)
- **AI brain**: Anthropic Claude via an agentic tool-use loop (`/api/jarvis`); tools execute client-side against your data
- **Voice**: Web Speech API — wake-phrase detection, continuous listening, TTS responses
- **Prayer times**: computed locally with a full astronomical solver (`src/lib/prayer-times.ts`) — no external API
- **Desktop control**: companion bridge design in `docs/04-desktop-architecture.md` (Tauri, localhost WebSocket)

## Safety model

JARVIS executes low-risk, reversible actions automatically. Anything irreversible — deleting files, sending messages, publishing, purchasing, transferring money — requires explicit confirmation. See the safety tiers in `docs/03-agent-architecture.md`.
