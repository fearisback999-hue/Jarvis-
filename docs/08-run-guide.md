# 08 — Run Guide: Local vs Cloud, and the Go-Live Checklist

## The answer: hybrid. Local for JARVIS, cloud for the POD engine.

| Piece | Where | Why |
|---|---|---|
| **JARVIS app** (`npm run dev`) | **Your PC** | The desktop bridge and voice mode physically require your machine; your data lives in the browser (private, free, instant). A strong PC makes it fly. |
| **Desktop bridge** (`node desktop-bridge/bridge.mjs`) | **Your PC** (only option) | It controls *this* computer. |
| **Knowledge Galaxy** (`cd galaxy && python3 server.py`) | **Your PC** | Personal notes stay local; `claude -p` fallback uses your local Claude Code login. |
| **TikTok engine** (`tt-engine` CLI) | **Your PC** | On-demand research runs; schedule `scripts/daily_cron.py` with Task Scheduler/cron if wanted. |
| **NEO POD engine** | **Cloud (Vercel — free tier)** | The whole point is it runs the pipeline, order sync, and optimization **on a schedule, 24/7** — even when your PC is off, asleep, or you're at school. It was built for Vercel (`vercel.json` crons, Blob storage). Your PC being strong doesn't help a scheduler that needs the machine awake at 5am. |

**Local-only alternative for the POD engine** (works, with one trade-off): run it on your PC with `TURSO_DATABASE_URL=file:./local.db` and let JARVIS point at `http://localhost:3001`. Trade-off: scheduled runs only happen while the PC is on — fine if it's always on; risky if it sleeps.

## Boot order on your PC (daily)

```bash
# 1. JARVIS
cd Jarvis- && npm install && npm run dev          # http://localhost:3000

# 2. Desktop bridge (separate terminal)
node desktop-bridge/bridge.mjs                     # paste token into Settings once

# 3. Galaxy (optional, separate terminal)
cd galaxy && python3 build.py && python3 server.py # http://localhost:4700
```

## Verified before shipping (what "no bugs" means here)

- **JARVIS**: production build compiles clean; all 16 routes render with zero page/console errors; core flows exercised end-to-end in a real browser (schedule generation, task add, offline chat, bills guard block/allow/pay, ad over-budget block, product search, voice-planner commands, MCP discovery + live tool call).
- **NEO POD engine**: `npm install` + full production build pass from this repo.
- **TikTok engine**: full test suite — **109/109 tests pass** from this repo.
- **Galaxy**: build, server, chat (+ follow-ups), sources, voice wiring, remember-flow, and config isolation all exercised live.
- Guard rails **fail closed**: no bank balance → no payments; over-budget → blocked; the AI has no payment tool at all.

What no one can honestly promise: zero bugs forever — external APIs change, browsers update. What's engineered in instead: every failure lands soft (status cards say "offline/not configured" instead of crashing, a global error boundary catches anything unexpected, and your data is local so a UI bug can't eat it).

## Go-live checklist (in order, ~45 min total)

1. **JARVIS runs** with zero keys — verify pages load, add a task, generate a schedule.
2. **Bridge paired** — run it, paste token in Settings, say "Hey Jarvis, open Chrome."
3. **AI brain on** — `ANTHROPIC_API_KEY` in `.env.local`, ask JARVIS something multi-step.
4. **POD engine cloud**: deploy `engines/pod-neo` to Vercel → set its env (OpenAI, Printify, Etsy, Turso, `CRON_SECRET`) → set `POD_ENGINE_URL` + `POD_CRON_SECRET` in JARVIS → press "Sync orders" on the POD page (read-only test) **before** ever pressing "Run pipeline" (spends money).
5. **Bank link** — Plaid keys, link account, set your three guard caps deliberately.
6. **TikTok engine** — `pip install -e .`, `cp .env.example .env`, run `tt-engine --help`, then a mock-feed run before paying for data feeds.

Start every integration in its cheapest/read-only mode, confirm it behaves, then unlock the spending parts. That order is what keeps "everything's wrong" from ever happening.
