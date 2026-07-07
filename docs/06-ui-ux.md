# 06 — UI/UX Design System

Inspiration: Apple (restraint), Linear (density + speed), Raycast (keyboard-first), Arc (personality), Notion (calm surfaces). Dark mode is the primary theme.

## Foundations

| Token | Value |
|---|---|
| Background | `#09090b` (zinc-950) with elevated surfaces `#111113` / `#18181b` |
| Borders | `1px` hairlines, `rgba(255,255,255,0.08)` |
| Text | `#fafafa` primary · `#a1a1aa` secondary · `#52525b` muted |
| Accent | Emerald `#10b981` (JARVIS green) — used sparingly: active states, live indicators, primary actions |
| Pillar colors | wealth emerald · business sky · boxing red · law amber · fitness violet · islam teal · self rose |
| Radius | `12px` cards, `8px` controls |
| Type | Inter / system-ui; 13–14px body, tabular numerals for money |
| Motion | 150–250ms ease-out; Framer Motion for page/list transitions; nothing bounces |

## Shell

```
┌──────────┬──────────────────────────────────────────────┐
│  JARVIS  │  ⌘K command bar         🎙 voice   ● online  │
│          ├──────────────────────────────────────────────┤
│ ● Home   │                                              │
│ ◆ Jarvis │              module content                  │
│ $ Money  │      (stat row → charts → lists/forms)       │
│ ▶ TikTok │                                              │
│ ▶ Etsy   │                                              │
│ ✊ Boxing │                                              │
│ ⚡ Gym    │                                              │
│ ♥ Health │                                              │
│ ⚖ Law    │                                              │
│ ☪ Islam  │                                              │
│ ▦ Sched  │                                              │
│ ☑ Tasks  │                                              │
│ ⚙ Config │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- Sidebar: 220px, icons + labels, active item gets accent bar. Collapses on mobile.
- Every page follows the same rhythm: **header → stat cards → primary content grid**.
- Keyboard-first: `g` then key navigates (Linear-style), `⌘K` command palette (roadmap), `⌘J` jump to JARVIS chat.

## Key screens (mockups)

### Command Center (`/`)
```
Good morning, Commander.            Fajr ✓ · Dhuhr in 2h 14m
┌─ Today's ROI focus ─────────┐ ┌─ Money ────────┐ ┌─ Readiness ─┐
│ 1. Film 3 TikToks   ROI 9.2 │ │ $2,140 / mo    │ │     82      │
│ 2. Etsy: 5 listings ROI 8.7 │ │ ▲ 12% vs last  │ │  sleep 7.5h │
│ 3. LSAT logic 45m   ROI 8.1 │ └────────────────┘ └─────────────┘
├─ Schedule ──────────────────┴───────────────────────────────────┐
│ 05:12 Fajr · 06:00 Roadwork · 08:00 School · 16:30 Asr ...      │
└──────────────────────────────────────────────────────────────────┘
```

### JARVIS (`/jarvis`)
Chat column + right rail showing live agent activity (tool calls as compact cards: `✓ create_task "Film 3 TikToks"`). Voice orb at the bottom: idle ring → listening pulse → speaking waveform. Wake-phrase toggle in header.

### Money (`/money`)
Stat row (revenue, profit, expenses, net worth) → cash-flow area chart + income-by-source donut → transactions table with inline add → goals with progress bars.

### Islam (`/islam`)
Hero: next prayer countdown (large tabular timer). Five prayer cards for today (tap to log on-time/jamaah/late/missed). Qur'an + dhikr trackers, streak flame, Ramadan-mode toggle.

### Boxing (`/boxing`)
Skill radar chart · session log · weight trend vs fight target · this week's coach plan.

## Component inventory

`StatCard` · `Card` · `SectionHeader` · `Badge` (pillar-colored) · `ProgressBar` · `Sparkline` · `DataTable` · `InlineForm` · `EmptyState` · `ConfirmCard` (high-risk actions) · `VoiceOrb` · `ToolCallChip` · `StreakFlame` · `CountdownTimer`

## Interaction principles

1. **Zero-friction logging** — every log action ≤ 2 interactions from its page.
2. **Optimistic UI** — writes hit the local store instantly.
3. **Numbers breathe** — money and timers use tabular numerals, animate on change.
4. **Nothing modal unless irreversible** — confirmation dialogs are reserved for high-tier actions, matching the safety model.
5. **Responsive** — sidebar → bottom bar on mobile; cards stack single-column.
