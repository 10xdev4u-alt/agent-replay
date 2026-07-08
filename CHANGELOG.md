# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Core (`@agent-replay/core`)
- Event schema with typed kinds, severities, and span tracking
- `Recorder` — the heart: wraps an agent run, emits typed events
- `JsonlWriter` / `readAll` / `readStreaming` — streaming JSONL persistence
- `ReplayEngine` — reconstructs state at any cursor; pure function of events
- `SpanTracker` — nested span grouping for trace trees
- `summarize()` inspector — per-kind/severity/tool/provider/tokens/cost aggregates
- Composable event filters (`byKind`, `byText`, `bySpan`, `all`, `any`, `not`, …)
- SDK wrappers: `wrapAgent`, `wrapFetch`, `recordMetric`, `withRecording`
- Model pricing table + `costOf` / `totalCost` / `formatCost`
- Gzipped portable `.replay` archive format (`toArchive` / `fromArchive`)
- `diffRecordings` — aligns two runs by key, surfaces added/removed/changed
- Browser-safe entry (`@agent-replay/core/browser`) for the viewer

### Added — CLI (`agent-replay`)
- `record <script>` — run a Node script with recording
- `play <file>` — render a recording as a readable timeline
- `serve [dir]` — HTTP server for the viewer
- `info <file>` — summary stats for a recording
- `export` / `import` — convert between `.replay.jsonl` and `.replay`
- `convert` — auto-detect format and convert to the other
- `diff <a> <b>` — compare two recordings
- `version` — print installed version
- Zero runtime dependencies — Node builtins only (`parseArgs`, `node:http`)

### Added — Viewer (`@agent-replay/viewer`)
- Vite + React app, builds to ~52KB gzipped
- Drop a `.replay.jsonl` file or load via `?src=` URL
- Timeline scrubber — GPU-composited bars, color-coded by kind
- Conversation view — reconstructed messages with streaming caret
- Event inspector — expandable JSON payload tree
- Stats panel — duration, tokens, cost, providers, tools
- Search + kind-filter bar
- Span tree visualization with click-to-seek
- Autoplay at real-time pace + speed control (0.25×–8×)
- Keyboard shortcuts (space, ←/→, Home/End, +/-)

### Added — Examples & Docs
- `demo-agent.ts` example + generated `demo.replay.jsonl` fixture
- README, CONTRIBUTING, MIT LICENSE

### Tests
- Core: 34 tests across replay, filters, pricing, diff, round-trip self-check
- CLI: 7 smoke tests covering help, version, info, play, export→import, diff

### CI
- GitHub Actions workflow: typecheck + build + test on Node 20 and 22

[Unreleased]: https://github.com/10xdev4u-alt/agent-replay/commits/main
