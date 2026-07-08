/**
 * Diff engine tests — verify two-run comparison alignment + summaries.
 */
import { describe, it, expect } from "vitest";
import { diffRecordings, defaultDiffKey } from "../src/diff.js";
import type { AgentEvent } from "../src/types.js";

function evt(id: string, kind: AgentEvent["kind"], name: string, data: unknown, ts = 1_000): AgentEvent {
  return { id, ts, kind, name, level: "info", spanId: "root", parentId: null, data };
}

describe("diffRecordings", () => {
  it("flags identical runs as all-same", () => {
    const a = [evt("1", "message", "message.user", "hi")];
    const d = diffRecordings(a, a);
    expect(d.counts.same).toBe(1);
    expect(d.counts.added).toBe(0);
    expect(d.counts.removed).toBe(0);
    expect(d.counts.changed).toBe(0);
  });

  it("detects added events (right-only)", () => {
    const a = [evt("1", "message", "message.user", "hi")];
    const b = [
      evt("1", "message", "message.user", "hi"),
      evt("2", "message", "message.assistant", "hello"),
    ];
    const d = diffRecordings(a, b);
    expect(d.counts.added).toBe(1);
    expect(d.counts.same).toBe(1);
  });

  it("detects removed events (left-only)", () => {
    const a = [
      evt("1", "message", "message.user", "hi"),
      evt("2", "message", "message.assistant", "hello"),
    ];
    const b = [evt("1", "message", "message.user", "hi")];
    const d = diffRecordings(a, b);
    expect(d.counts.removed).toBe(1);
  });

  it("detects changed payloads under the same key", () => {
    const a = [evt("1", "message", "message.user", "hi")];
    const b = [evt("1", "message", "message.user", "hey there")];
    const d = diffRecordings(a, b);
    expect(d.counts.changed).toBe(1);
    expect(d.entries[0].metricsDiverged).toBe(false);
  });

  it("flags diverged metric values", () => {
    const a = [evt("1", "metric", "metric.tokens", { name: "tokens", value: 100 })];
    const b = [evt("1", "metric", "metric.tokens", { name: "tokens", value: 200 })];
    const d = diffRecordings(a, b);
    expect(d.counts.changed).toBe(1);
    expect(d.entries[0].metricsDiverged).toBe(true);
  });

  it("aggregates token/cost/duration deltas from summaries", () => {
    const a = [
      evt("1", "metric", "metric.tokens", { name: "tokens", value: 50 }, 1_000),
      evt("2", "metric", "metric.tokens", { name: "tokens", value: 50 }, 1_500),
    ];
    const b = [
      evt("1", "metric", "metric.tokens", { name: "tokens", value: 80 }, 1_000),
      evt("2", "metric", "metric.tokens", { name: "tokens", value: 90 }, 1_600),
    ];
    const d = diffRecordings(a, b);
    expect(d.tokenDelta).toBe(70); // 170 - 100
    expect(d.durationDeltaMs).toBe(100); // (1600-1000) - (1500-1000)
  });

  it("defaultDiffKey is kind:name", () => {
    const e = evt("1", "message", "message.user", "x");
    expect(defaultDiffKey(e)).toBe("message:message.user");
  });

  it("accepts a custom key function", () => {
    const a = [evt("1", "message", "x", "v1")];
    const b = [evt("2", "message", "x", "v2")]; // different id, same kind+name
    const d = diffRecordings(a, b, (e) => e.id); // align by id → no match
    expect(d.counts.removed).toBe(1);
    expect(d.counts.added).toBe(1);
  });
});
