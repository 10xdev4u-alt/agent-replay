/**
 * ReplayEngine tests — state reconstruction at any cursor.
 */
import { describe, it, expect } from "vitest";
import { Recorder } from "../src/recorder.js";
import { ReplayEngine } from "../src/replay.js";
import type { AgentEvent } from "../src/types.js";

function makeEvents(): AgentEvent[] {
  const rec = new Recorder({ name: "test", clock: () => 1000 });
  rec.message("user", "hello");
  rec.metric("tokens", 42);
  rec.metric("cost", 0.001);
  rec.error(new Error("boom"));
  return rec.end();
}

describe("ReplayEngine", () => {
  it("reconstructs messages up to cursor", () => {
    const engine = new ReplayEngine(makeEvents());
    const empty = engine.at(0);
    expect(empty.messages).toHaveLength(0);

    const partial = engine.at(2);
    expect(partial.messages.length).toBeGreaterThan(0);
    expect(partial.messages[0].role).toBe("user");
  });

  it("accumulates metrics only from visible events", () => {
    const engine = new ReplayEngine(makeEvents());
    expect(engine.at(0).tokens).toBe(0);
    expect(engine.final().tokens).toBe(42);
    expect(engine.final().cost).toBe(0.001);
  });

  it("collects errors in the visible window", () => {
    const engine = new ReplayEngine(makeEvents());
    expect(engine.at(2).errors).toHaveLength(0);
    expect(engine.final().errors.length).toBeGreaterThan(0);
  });

  it("final() shows all events", () => {
    const engine = new ReplayEngine(makeEvents());
    const state = engine.final();
    expect(state.cursor).toBe(engine.length);
    expect(state.counts.message).toBeGreaterThan(0);
  });

  it("indexOf finds matching events", () => {
    const engine = new ReplayEngine(makeEvents());
    const firstMsg = engine.indexOf((e) => e.kind === "message");
    expect(firstMsg).toBeGreaterThanOrEqual(0);
  });
});
