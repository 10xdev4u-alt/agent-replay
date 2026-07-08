/**
 * Recorder + Writer integration tests.
 *
 * Exercises the full emit → write → read cycle on disk, plus the payload
 * cap and the span helpers. These are the paths most likely to silently
 * break (serialization, file handles, truncation).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Recorder } from "../src/recorder.js";
import { JsonlWriter } from "../src/writer.js";
import { readAll } from "../src/reader.js";
import { ReplayEngine } from "../src/replay.js";

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "agent-replay-io-"));
  path = join(dir, "run.replay.jsonl");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("recorder + writer", () => {
  it("emits a meta event on construction", () => {
    const rec = new Recorder({ name: "t" });
    expect(rec.events.length).toBe(1);
    expect(rec.events[0].kind).toBe("meta");
  });

  it("writes events to disk as valid JSONL", async () => {
    const rec = new Recorder({ name: "t" });
    rec.message("user", "hi");
    rec.message("assistant", "hello");
    const events = rec.end();

    const writer = new JsonlWriter(path);
    await writer.open();
    for (const e of events) await writer.write(e);
    await writer.close();

    expect(existsSync(path)).toBe(true);
    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines.length).toBe(events.length);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("readAll recovers written events losslessly", async () => {
    const rec = new Recorder({ name: "t" });
    rec.message("user", "ping");
    const span = rec.span("tool:echo");
    rec.toolCall("echo", { msg: "ping" });
    rec.toolResult("echo", { msg: "ping" });
    span.end();
    rec.metric("tokens", 5);
    const events = rec.end();

    const writer = new JsonlWriter(path);
    await writer.open();
    for (const e of events) await writer.write(e);
    await writer.close();

    const { events: read, dropped } = await readAll(path);
    expect(dropped).toHaveLength(0);
    expect(read.length).toBe(events.length);
    // Same ids, same order.
    expect(read.map((e) => e.id)).toEqual(events.map((e) => e.id));
  });

  it("caps oversized payloads", () => {
    const rec = new Recorder({ name: "t", maxPayloadBytes: 64 });
    const big = "x".repeat(10_000);
    const evt = rec.toolResult("dump", { big });
    const data = evt.data as { __truncated?: boolean; originalBytes?: number };
    expect(data.__truncated).toBe(true);
    expect(data.originalBytes).toBeGreaterThan(64);
  });

  it("replay engine reconstructs the conversation from disk", async () => {
    const rec = new Recorder({ name: "t" });
    rec.message("user", "hello");
    rec.delta("world");
    const events = rec.end();

    const writer = new JsonlWriter(path);
    await writer.open();
    for (const e of events) await writer.write(e);
    await writer.close();

    const { events: read } = await readAll(path);
    const state = new ReplayEngine(read).final();
    expect(state.messages.length).toBeGreaterThan(0);
  });
});
