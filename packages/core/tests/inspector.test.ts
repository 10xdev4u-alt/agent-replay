/**
 * Inspector tests — summarize() aggregates a recording into stats.
 * Covers kind/severity counts, tool usage, provider usage, metrics,
 * span depth, and the binary-search timestamp finder.
 */
import { describe, it, expect } from "vitest";
import { summarize, findEventAtTimestamp } from "../src/inspector.js";
import type { AgentEvent } from "../src/types.js";
import { createEvent } from "../src/factory.js";

function evt(
  kind: AgentEvent["kind"],
  name: string,
  data: unknown,
  ts: number,
  spanId = "root",
  parentId: string | null = null,
  level: AgentEvent["level"] = "info",
): AgentEvent {
  return { id: `e${ts}`, ts, kind, name, level, spanId, parentId, data };
}

describe("summarize", () => {
  it("counts zero events", () => {
    const s = summarize([]);
    expect(s.eventCount).toBe(0);
    expect(s.durationMs).toBe(0);
    expect(s.startedAt).toBeNull();
    expect(s.endedAt).toBeNull();
  });

  it("counts events by kind and severity", () => {
    const events = [
      evt("message", "m.user", { role: "user" }, 100),
      evt("error", "err", {}, 200, "root", null, "error"),
      evt("error", "err2", {}, 300, "root", null, "fatal"),
    ];
    const s = summarize(events);
    expect(s.byKind.message).toBe(1);
    expect(s.byKind.error).toBe(2);
    expect(s.bySeverity.error).toBe(1);
    expect(s.bySeverity.fatal).toBe(1);
  });

  it("aggregates tokens and cost from metric events", () => {
    const events = [
      evt("metric", "metric.tokens", { name: "tokens", value: 150 }, 100),
      evt("metric", "metric.tokens", { name: "tokens", value: 50 }, 200),
      evt("metric", "metric.cost", { name: "cost", value: 0.003 }, 300),
    ];
    const s = summarize(events);
    expect(s.totalTokens).toBe(200);
    expect(s.totalCost).toBeCloseTo(0.003);
    expect(s.errorCount).toBe(0);
  });

  it("tracks tool call counts and errors", () => {
    const events = [
      evt("tool_call", "read_file", {}, 100),
      evt("tool_call", "read_file", {}, 200),
      evt("tool_result", "read_file.result", {}, 250),
      evt("tool_result", "read_file.result", {}, 350, "root", null, "error"),
      evt("tool_call", "write_file", {}, 400),
    ];
    const s = summarize(events);
    const readFile = s.tools.find((t) => t.name === "read_file");
    expect(readFile?.calls).toBe(2);
    expect(readFile?.errors).toBe(1);
    expect(s.tools[0].calls).toBeGreaterThanOrEqual(s.tools[1].calls);
  });

  it("computes span depth and duration", () => {
    const events = [
      evt("tool_call", "t1", {}, 100, "s1", null),
      evt("tool_call", "t2", {}, 150, "s2", "s1"),
      evt("tool_call", "t3", {}, 200, "s3", "s2"),
    ];
    const s = summarize(events);
    expect(s.spanCount).toBe(3);
    expect(s.maxDepth).toBe(3);
    expect(s.durationMs).toBe(100);
  });

  it("tracks provider prompt/response counts", () => {
    const events = [
      evt("prompt", "openai", {}, 100),
      evt("prompt", "openai", {}, 200),
      evt("response", "openai", {}, 250),
      evt("prompt", "anthropic", {}, 300),
    ];
    const s = summarize(events);
    const openai = s.providers.find((p) => p.name === "openai");
    expect(openai?.prompts).toBe(2);
    expect(openai?.responses).toBe(1);
  });
});

describe("findEventAtTimestamp", () => {
  const events: AgentEvent[] = [
    createEvent({ kind: "message", name: "a", data: {} }, { ts: 100 }),
    createEvent({ kind: "message", name: "b", data: {} }, { ts: 200 }),
    createEvent({ kind: "message", name: "c", data: {} }, { ts: 300 }),
  ];

  it("returns -1 for a timestamp before all events", () => {
    expect(findEventAtTimestamp(events, 50)).toBe(-1);
  });

  it("finds exact and inexact matches via binary search", () => {
    expect(findEventAtTimestamp(events, 100)).toBe(0);
    expect(findEventAtTimestamp(events, 150)).toBe(0);
    expect(findEventAtTimestamp(events, 250)).toBe(1);
    expect(findEventAtTimestamp(events, 300)).toBe(2);
    expect(findEventAtTimestamp(events, 9999)).toBe(2);
  });
});
