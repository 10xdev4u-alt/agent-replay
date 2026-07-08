# @agent-replay/core

The engine behind `agent-replay`: a recorder, a replay engine, and the types that bind them. Framework-agnostic — works in Node and (via the `/browser` entry) in the browser.

## Install

```bash
pnpm add @agent-replay/core
# or
npm install @agent-replay/core
```

## Quickstart

### Record a run

```ts
import { Recorder } from "@agent-replay/core";

const rec = new Recorder({ name: "my-agent" });

rec.message("user", "What's the weather?");
const span = rec.span("model.openai.chat");
rec.prompt("openai", { model: "gpt-4o-mini", messages: [/* ... */] });
rec.response("openai", { content: "Sunny, 72°F." });
rec.metric("tokens", 142);
rec.metric("cost", 0.0001);
span.end();
rec.message("assistant", "Sunny, 72°F.");

const events = rec.end();
```

### Persist to disk

```ts
import { JsonlWriter } from "@agent-replay/core";

const writer = new JsonlWriter("./run.replay.jsonl", { truncate: true });
await writer.open();
for (const e of rec.events) await writer.write(e);
await writer.close();
```

### Replay / inspect

```ts
import { readAll, ReplayEngine, summarize } from "@agent-replay/core";

const { events } = await readAll("./run.replay.jsonl");
const engine = new ReplayEngine(events);
const state = engine.final();

console.log(state.messages);        // reconstructed conversation
console.log(state.tokens);          // total tokens
console.log(summarize(events));     // full recording summary
```

## Browser usage

Import from `/browser` to get a Node-builtin-free build:

```ts
import { ReplayEngine, summarize } from "@agent-replay/core/browser";
```

Only the pure-logic modules are exported there (no `fs`, `events`, `zlib`):
types, constants, factory, spans, replay, inspector, filters, serialize,
pricing. Use it in the viewer, or any browser-side replay UI.

## API surface

| Module       | Exports                                                    |
| ------------ | --------------------------------------------------------- |
| `types`      | `AgentEvent`, `EventKind`, `Severity`, `Role`             |
| `recorder`   | `Recorder`                                                |
| `spans`      | `SpanTracker`, `Span`                                     |
| `writer`     | `JsonlWriter`                                             |
| `reader`     | `readAll`, `readStreaming`, `isValidEvent`               |
| `replay`     | `ReplayEngine`, `ReplayState`, `ReplayMessage`            |
| `inspector`  | `summarize`, `RecordingSummary`, `findEventAtTimestamp`  |
| `filters`    | `byKind`, `byText`, `bySpan`, `all`, `any`, `not`, …     |
| `wrap`       | `wrapAgent`, `wrapFetch`, `withRecording`, `recordMetric` |
| `archive`    | `toArchive`, `fromArchive`, `writeArchive`, `readArchive` |
| `diff`       | `diffRecordings`, `RecordingDiff`, `defaultDiffKey`       |
| `serialize`  | `encodeEvent`, `decodeEvent`, `parseCompact`             |
| `pricing`    | `PRICES`, `priceFor`, `costOf`, `formatCost`             |

## Event model

Everything is an `AgentEvent`. Flat, serializable, one per JSONL line:

```ts
interface AgentEvent<T = unknown> {
  id: string;          // monotonic, unique within a recording
  ts: number;          // wall-clock ms since epoch
  kind: EventKind;     // message | prompt | response | delta | tool_call | ...
  name: string;        // e.g. "openai.chat.completions.create"
  level: Severity;     // debug | info | warn | error | fatal
  spanId: string;      // groups related events
  parentId: string | null;
  data: T;             // kind-specific payload
}
```

## License

MIT © [10xdev4u-alt](https://github.com/10xdev4u-alt)
