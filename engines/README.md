# Engines

The two pre-existing money engines, vendored from their original repos so everything lives in one place.

| Engine | Directory | Source | Vendored commit |
|---|---|---|---|
| **NEO POD** — AI-powered POD automation (generation → validation → listing → optimization) | [`pod-neo/`](pod-neo/) | [fearisback999-hue/Alsaduquon](https://github.com/fearisback999-hue/Alsaduquon) (`claude/automated-pod-system-oao4T`) | `46d014e` |
| **TikTok Shop Product Intelligence Engine** — detection-first product finder (momentum detection, 100-pt scoring, attack packets) | [`tiktok-engine/`](tiktok-engine/) | [fearisback999-hue/Pr](https://github.com/fearisback999-hue/Pr) (`claude/jolly-franklin-wekyhc`) | `9a76cd0` |

## Running NEO POD

Standalone Next.js app with its own database and env (see `pod-neo/.env.example`):

```bash
cd engines/pod-neo
npm install
npm run dev -- -p 3001
```

Then point JARVIS at it in the root `.env.local`:

```
POD_ENGINE_URL=http://localhost:3001        # or your Vercel deployment
POD_CRON_SECRET=<same CRON_SECRET as the engine>
```

JARVIS's POD page and voice commands ("run the pod pipeline", "sync pod orders",
"optimize pod listings") drive it through `/api/pod`.

## Running the TikTok engine

Python CLI (`tt-engine`), see `tiktok-engine/README.md` for the full pipeline:

```bash
cd engines/tiktok-engine
pip install -e .
cp .env.example .env   # add feed/LLM keys
tt-engine --help
```

Daily/weekly automation lives in `tiktok-engine/scripts/daily_cron.py` and
`weekly_cron.py`. With the JARVIS desktop bridge running you can also fire it by
voice — JARVIS uses the bridge's guarded `run` command (always confirmed first).

> Treat the upstream repos as the source of truth for further development; re-vendor
> (copy over these directories) when they move ahead.
