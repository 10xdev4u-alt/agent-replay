# @agent-replay/cli

Record, replay, and inspect AI agent runs from the terminal. Zero runtime
dependencies — built on Node's `util.parseArgs`.

## Install

```bash
npm install -g @agent-replay/cli
# or use without installing:
npx @agent-replay/cli <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `record <script>` | Run a Node script and capture its agent-replay events to a `.replay.jsonl` |
| `play <file>` | Render a recording as a readable timeline to stdout |
| `serve [dir]` | Serve recordings over HTTP for the viewer (`localhost:4319`) |
| `info <file>` | Print summary stats (events, tokens, cost, duration, errors) |
| `export <in> <out>` | Convert `.replay.jsonl` → portable `.replay` archive |
| `import <in> <out>` | Convert `.replay` archive → `.replay.jsonl` |
| `convert <in> [out]` | Auto-detect format and convert to the other |
| `diff <a> <b>` | Compare two recordings, show what changed |
| `version` | Print the installed version |

## Usage

### Record a run

```bash
# Your script imports @agent-replay/core, creates a Recorder, emits events.
AGENT_REPLAY_OUT=./run.replay.jsonl agent-replay record ./my-agent.js
```

### Inspect a recording

```bash
agent-replay info run.replay.jsonl
# recording: run.replay.jsonl
# events:    142 (3 dropped)
# duration:  8.4s
# tokens:    1,204
# cost:      $0.0021
# errors:    0
```

### Replay as a timeline

```bash
agent-replay play run.replay.jsonl
# +0.00s MSG  message.user                  What files are in src?
# +0.12s PRMT prompt.openai                 {model: gpt-4o, ...}
# +0.34s RSP  response.openai               I'll check the src directory...
```

### Compare two runs

```bash
agent-replay diff base.replay.jsonl new.replay.jsonl
# events:    142 → 138 (-4)
# tokens:    1,204 → 1,098 (-106)
# cost:      $0.0021 → $0.0019 (-$0.0002)
# changed events:
#   ~ message.user
#   ~ prompt.openai
```

### Serve for the viewer

```bash
agent-replay serve ./recordings
# → http://127.0.0.1:4319
# Open the viewer and point it at ?src=/recordings/run.replay.jsonl
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_REPLAY_OUT` | (derived) | Output path for `record` |
| `AGENT_REPLAY_PORT` | `4319` | Port for `serve` |
| `AGENT_REPLAY_HOST` | `127.0.0.1` | Host for `serve` |

## License

MIT
