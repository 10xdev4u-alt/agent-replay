# Examples

Real recordings + scripts showing agent-replay in action.

## demo-agent.ts

A synthetic agent loop — no real LLM is contacted. Emits a realistic run:
user message → thought → model prompt → streamed response deltas → tool call
→ tool result → assistant reply, with token + cost metrics.

### Run it

```bash
# from repo root, after building core
pnpm --filter @agent-replay/core build
node packages/examples/scripts/demo-agent.js
# → packages/examples/demo.replay.jsonl
```

Override the output path:

```bash
AGENT_REPLAY_OUT=/tmp/run.replay.jsonl node packages/examples/scripts/demo-agent.js
```

### Open it in the viewer

```bash
pnpm --filter @agent-replay/viewer dev
# drop packages/examples/demo.replay.jsonl into the browser, or:
# http://localhost:5319/?src=/recordings/demo.replay.jsonl
```

### Inspect from the CLI

```bash
pnpm --filter @agent-replay/cli exec -- agent-replay info packages/examples/demo.replay.jsonl
pnpm --filter @agent-replay/cli exec -- agent-replay play packages/examples/demo.replay.jsonl
```

## demo.replay.jsonl

The pre-generated recording shipped with the repo (20 events). Use it to try
the viewer or CLI without running the script first.
