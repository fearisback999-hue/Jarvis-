# 08 — Run Guide

JARVIS is local-first and runs entirely on your own machine. There's no cloud
service to deploy — the app, your data, and the desktop bridge all live on
your PC.

| Piece | Where | Why |
|---|---|---|
| **JARVIS app** (`npm run dev`) | **Your PC** | The desktop bridge and voice mode physically require your machine; your data lives in the browser (private, free, instant). |
| **Desktop bridge** (`node desktop-bridge/bridge.mjs`) | **Your PC** (only option) | It controls *this* computer — opening apps/sites, volume, media, typing, screenshots, lock. |
| **Knowledge Galaxy** (`cd galaxy && python3 server.py`) | **Your PC**, optional | Personal notes stay local; `claude -p` fallback uses your local Claude Code login. |

## Boot order on your PC (daily)

```bash
# 1. JARVIS
cd Jarvis- && npm install && npm run dev          # http://localhost:3000

# 2. Desktop bridge (separate terminal)
node desktop-bridge/bridge.mjs                     # paste token into Settings once

# 3. Galaxy (optional, separate terminal)
cd galaxy && python3 build.py && python3 server.py # http://localhost:4700
```

## Go-live checklist

1. **JARVIS runs** with zero keys — verify pages load, add a task, generate a schedule.
2. **Bridge paired** — run it, paste the token in Settings, say "Hey Jarvis, open Chrome" or "Hey Jarvis, open TikTok and look up boxing videos."
3. **AI brain on** (optional) — either point `LOCAL_LLM_URL` at a local Ollama server, or set `ANTHROPIC_API_KEY` in `.env.local`, then ask JARVIS something multi-step. With neither, the offline planner still handles scheduling, prayers, tasks, career status, and money.

What's engineered in: every failure lands soft (status cards say "offline/not configured" instead of crashing, a global error boundary catches anything unexpected), and your data is local so a UI bug can't eat it.
