/**
 * Merge — stitch multiple recordings into one monotonic stream.
 */
import { describe, it, expect } from "vitest";
import { mergeRecordings, type MergeSource } from "../src/merge.js";
import type { AgentEvent } from "../src/types.js";

function evt(id: string, ts: number, kind: AgentEvent["kind"], name: string): AgentEvent {
  return { id, ts, kind, name, level: "info", spanId: "root", parentId: null, data: {} };
}

describe("mergeRecordings", () => {
  it("concatenates sources with monotonic timestamps", () => {
    const a: MergeSource = {
      name: "a",
      events: [evt("a1", 100, "message", "m1"), evt("a2", 200, "message", "m2")],
    };
    const b: MergeSource = {
      name: "b",
      events: [evt("b1", 500, "message", "m3"), evt("b2", 600, "message", "m4")],
    };

    const merged = mergeRecordings([a, b]);

    // Monotonic timestamps.
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i].ts).toBeGreaterThanOrEqual(merged[i - 1].ts);
    }
    // All ids unique.
    const ids = new Set(merged.map((e) => e.id));
    expect(ids.size).toBe(merged.length);
  });

  it("prefixes ids per source to avoid collisions", () => {
    const a: MergeSource = {
      name: "a",
      events: [evt("dup", 0, "message", "m")],
    };
    const b: MergeSource = {
      name: "b",
      events: [evt("dup", 0, "message", "m")],
    };

    const merged = mergeRecordings([a, b]);
    expect(merged[0].id).toMatch(/^a_/);
    expect(merged[1].id).toMatch(/^b_/);
  });

  it("drops all but the first meta event by default", () => {
    const a: MergeSource = {
      name: "a",
      events: [evt("a1", 0, "meta", "session.meta"), evt("a2", 1, "message", "m")],
    };
    const b: MergeSource = {
      name: "b",
      events: [evt("b1", 0, "meta", "session.meta"), evt("b2", 1, "message", "m")],
    };

    const merged = mergeRecordings([a, b]);
    const metas = merged.filter((e) => e.kind === "meta");
    expect(metas).toHaveLength(1);
  });

  it("keeps all meta events when dropMeta is false", () => {
    const a: MergeSource = {
      name: "a",
      events: [evt("a1", 0, "meta", "session.meta")],
    };
    const b: MergeSource = {
      name: "b",
      events: [evt("b1", 0, "meta", "session.meta")],
    };

    const merged = mergeRecordings([a, b], { dropMeta: false });
    const metas = merged.filter((e) => e.kind === "meta");
    expect(metas).toHaveLength(2);
  });

  it("skips empty sources", () => {
    const a: MergeSource = { name: "a", events: [evt("a1", 0, "message", "m")] };
    const empty: MergeSource = { name: "empty", events: [] };

    const merged = mergeRecordings([empty, a]);
    expect(merged).toHaveLength(1);
  });
});
