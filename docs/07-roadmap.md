# 07 — Implementation Roadmap

## Phase 0 — Foundation ✅ (this repo, today)

- [x] Architecture, schema, agent/desktop/automation design docs
- [x] Next.js 15 + TS + Tailwind v4 app shell, dark premium UI, sidebar navigation
- [x] Typed local-first data layer (Zustand + localStorage) mirroring the Prisma schema
- [x] **All 13 module pages functional**: Command Center, JARVIS, Money, TikTok, Etsy, Boxing, Gym, Health, Law, Islam, Schedule, Tasks, Settings
- [x] **Prayer engine**: full astronomical solver (MWL/ISNA/Egypt/Karachi/UmmAlQura, Hanafi Asr), countdowns, logging, streaks — offline
- [x] **ROI engine + Smart Scheduler**: day plan generated around prayer anchors, missed-block reflow
- [x] **JARVIS brain**: `/api/jarvis` agentic tool-use loop (Claude) with client-side tool execution; deterministic local fallback without a key
- [x] **Voice mode**: "Hey Jarvis" wake phrase, continuous STT, TTS replies (Web Speech API)
- [x] Prisma schema for the production database

## Phase 1 — Cloud spine (week 1–2)

- [ ] Supabase project: Postgres + Auth (email/OAuth), RLS per user
- [ ] Prisma migrations; write-through sync layer with offline queue
- [ ] Streaming responses + conversation persistence for JARVIS
- [ ] Command palette (⌘K) and `g`-key navigation

## Phase 2 — Money & Business depth (week 3–4)

- [ ] CSV import for transactions; budget engine; tax set-aside rules
- [ ] Forecasting (run-rate + seasonality) and ROI reports
- [ ] Etsy API OAuth: listings CRUD, orders, stats sync
- [ ] Printify API: product creation + mockups + publish pipeline
- [ ] TikTok content studio: script generator tuned by past performance

## Phase 3 — Automation layer (week 5–6)

- [ ] Job runner (Trigger.dev or n8n): morning briefing, nightly summary, weekly/monthly reviews as real scheduled jobs with email/push delivery
- [ ] Playwright worker service + first workflows: trend research, competitor scans, analytics pulls
- [ ] Google Calendar two-way sync
- [ ] Notifications: web push + email digests

## Phase 4 — Desktop companion (week 7–9)

- [ ] Tauri shell: tray, global hotkey, autostart, native notifications
- [ ] Rust command bridge (loopback WS, pairing token, capability tiers)
- [ ] Desktop tools wired into the agent registry: open apps, URLs, media, volume, files
- [ ] Screenshot + screen-understanding loop (vision-grounded input control)
- [ ] Always-on wake-word listener in the companion

## Phase 5 — Intelligence deepening (week 10+)

- [ ] Episodic memory mining: weekly review learns preferences and updates pillar weights
- [ ] Multi-model routing (Claude default; OpenAI/Gemini/local via `LLMProvider` interface)
- [ ] Proactive mode: JARVIS opens the conversation (readiness dips, missed streaks, revenue anomalies)
- [ ] Ramadan mode: schedule inversion around suhoor/iftar/taraweeh
- [ ] Fight-camp mode: periodized training + weight-cut tracking takeover of the scheduler

## Definition of "production-ready"

1. Auth + cloud sync with RLS; data survives any device.
2. P95 interaction < 100ms (local writes), LLM streaming starts < 1.5s.
3. All high-tier actions gated by confirmation; full agent audit log.
4. Scheduled jobs monitored with failure alerts.
5. E2E tests (Playwright) on the critical paths: log prayer, add transaction, generate schedule, JARVIS tool round-trip.
