# 🎬 agent-replay

> **Time-travel for AI agents.** Record a run, replay it move-by-move, share it.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green)]()

When your AI agent does something weird, you ask: **"why did it do that?"**
Today the answer is *read the messy logs*. `agent-replay` gives you a
**timeline you can scrub** — every LLM call, every tool call, every token —
reconstructable to any moment, and **shareable as a single file**.

---

## Why

Stack Overflow's 2026 survey: **84% of devs use AI, only 29% trust it.** The #1
debugging pain is *"why did my agent do that?"* Nobody has good agent
debugging. We fix that.

`agent-replay` is the **Chrome DevTools for AI agents** that nobody built yet.

## Packages

This is a pnpm monorepo with three packages:

| Package | What | Status |
|---|---|---|
| [`@agent-replay/core`](./packages/core) | Recorder, JSONL writer/reader, replay engine, inspector, filters | ✅ built |
| [`@agent-replay/cli`](./packages/cli) | `record`, `play`, `serve`, `info`, `version` commands | ✅ built |
| [`@agent-replay/viewer`](./packages/viewer) | React + Vite web player with scrubable timeline | ✅ built |

## Quickstart

```bash
git clone https://github.com/10xdev4u-alt/agent-replay.git
cd agent-replay
pnpm install
pnpm build
```

### Record an agent run

```ts
import { Recorder, JsonlWriter } from "@agent-replay/core";

const rec = new Recorder({ name: "my-agent" });
rec.message("user", "hello");

const span = rec.span("tool:read_file");
rec.toolCall("read_file", { path: "/tmp/x" });
rec.toolResult("read_file", { ok: true });
span.end();

rec.metric("tokens", 42);
const events = rec.end();

const writer = new JsonlWriter("run.replay.jsonl", { truncate: true });
await writer.open();
for (const e of events) await writer.write(e);
await writer.close();
```

### Replay it in the terminal

```bash
agent-replay play run.replay.jsonl
agent-replay info run.replay.jsonl
```

### Replay it in the browser

```bash
agent-replay serve ./recordings   # serves on :4319
pnpm --filter viewer dev          # viewer on :5319
# open http://localhost:5319/?src=/recordings/run.replay.jsonl
```

## The recording format

One event per line, newline-delimited JSON. Crash-safe, gzip-friendly,
streamable:

```jsonl
{"id":"evt_1","ts":1720000000000,"kind":"meta","name":"session.meta","level":"info","spanId":"root","parentId":null,"data":{"name":"my-agent"}}
{"id":"evt_2","ts":1720000000001,"kind":"message","name":"message.user","level":"info","spanId":"root","parentId":null,"data":{"role":"user","content":"hello"}}
{"id":"evt_3","ts":1720000000002,"kind":"tool_call","name":"tool.read_file","level":"info","spanId":"span_1","parentId":null,"data":{"path":"/tmp/x"}}
```

## Status

🚧 **v0.1 in active development.** Core, CLI, and viewer are functional.
Record a real agent, ship a shareable demo next.

## License

MIT © [10xdev4u-alt](https://github.com/10xdev4u-alt)
