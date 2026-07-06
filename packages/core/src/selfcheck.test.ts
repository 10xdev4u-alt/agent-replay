/**
 * Core self-test — a single runnable check that the core pipeline works.
 * Run: `node --test packages/core/src/selfcheck.test.ts`
 *
 * Not a full suite — just the smallest thing that fails if recorder,
 * writer, reader, or replay engine breaks. Full unit tests live in
 * packages/core/tests/*.test.ts.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Recorder } from "./recorder.js";
import { JsonlWriter } from "./writer.js";
import { readAll } from "./reader.js";
import { ReplayEngine } from "./replay.js";
import { filterEvents, byKind } from "./filters.js";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "agent-replay-"));
}

describe("core round-trip", () => {
  it("records, writes, reads, and replays a tiny session", async () => {
    const dir = makeTempDir();
    const file = join(dir, "run.replay.jsonl");

    // 1. Record a tiny session
    const rec = new Recorder({ name: "self-check" });
    rec.message("user", "hello");
    const span = rec.span("tool:read_file");
    rec.toolCall("read_file", { path: "/tmp/x" });
    rec.toolResult("read_file", { ok: true });
    span.end();
    rec.metric("tokens", 42);
    const events = rec.end();

    // 2. Write to disk
    const writer = new JsonlWriter(file);
    await writer.open();
    for (const e of events) await writer.write(e);
    await writer.close();

    // 3. Read back
    const { events: read, dropped } = await readAll(file);
    expect(dropped).toHaveLength(0);
    expect(read.length).toBe(events.length);

    // 4. Replay reconstructs messages + metrics
    const state = new ReplayEngine(read).final();
    expect(state.messages.length).toBeGreaterThan(0);
    expect(state.tokens).toBe(42);

    // 5. Filters work
    const metrics = filterEvents(read, byKind("metric"));
    expect(metrics).toHaveLength(1);

    rmSync(dir, { recursive: true, force: true });
  });

  it("tolerates malformed lines in lenient mode", async () => {
    const dir = makeTempDir();
    const file = join(dir, "bad.replay.jsonl");
    // Two valid-ish lines, one garbage line.
    writeFileSync(file, "not json\n{}\n");
    const { dropped } = await readAll(file, { lenient: true });
    expect(dropped.length).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });
});
