# @agent-replay/viewer

The web player for `agent-replay` recordings. Drop a `.replay.jsonl` file (or
load one via `?src=`) and scrub the timeline to watch the agent think in
real-time, inspect any event, and compare runs.

## Stack

- **React + Vite** — fast HMR, tiny production bundle (~52KB gzipped)
- **TypeScript strict** — every component fully typed
- **CSS Modules** — scoped styles, no UI framework
- **`@agent-replay/core/browser`** — pure-logic core, no Node builtins

## Run

```bash
pnpm --filter @agent-replay/viewer dev    # http://localhost:5319
pnpm --filter @agent-replay/viewer build  # → dist/
```

## Loading a recording

Three ways:

1. **Drag & drop** a `.replay.jsonl` or `.replay` file onto the window
2. **Query string**: `?src=/recordings/demo.replay.jsonl`
3. **Dev proxy**: point the CLI `serve` command at a dir, proxy `/recordings`
   is configured in `vite.config.ts`

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause (real-time pacing) |
| `←` / `→` | Step back / forward one event |
| `Home` / `End` | Jump to start / end |
| `+` / `−` | Speed up / slow down (0.25× – 8×) |
| `?` | Toggle this help overlay |

## Components

- **Timeline** — GPU-composited scrubber, one bar per event, color-coded by kind
- **Conversation** — reconstructed chat that streams in delta-by-delta
- **SpanTree** — nested span visualization (collapsible)
- **StatsPanel** — duration, tokens, cost, provider/tool breakdowns
- **FilterBar** — free-text search + kind toggles
- **EventInspector** — full payload of the selected event
- **KeyboardHelp** — overlay listing all shortcuts

## Architecture

The viewer is a **pure consumer** of `@agent-replay/core`. It never touches
`fs`/`events` — it imports from `core/browser`, which re-exports only the
pure-logic modules (types, replay engine, inspector, filters, pricing, diff).

```
fetch(jsonl) → parse → ReplayEngine → state at cursor → components
```

All replay logic lives in core; the viewer is presentation only. This means
the exact same `ReplayEngine.at(cursor)` drives both the web UI and the CLI's
`play` command — one source of truth.
