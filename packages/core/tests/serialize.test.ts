/**
 * Compact serialization round-trip + size tests.
 */
import { describe, it, expect } from "vitest";
import {
  encodeEvent,
  decodeEvent,
  encodeEvents,
  decodeEvents,
  serializeCompact,
  parseCompact,
  createEvent,
} from "../src/index.js";

describe("serialize", () => {
  it("encodes + decodes a single event losslessly", () => {
    const evt = createEvent(
      { kind: "message", name: "message.user", data: { role: "user", content: "hi" } },
      { id: "evt_1", ts: 1000, spanId: "root", parentId: null },
    );
    const compact = encodeEvent(evt);
    expect(compact[0]).toBe("evt_1");
    expect(compact[2]).toBe("message");
    expect(decodeEvent(compact)).toEqual(evt);
  });

  it("encodes + decodes a list losslessly", () => {
    const events = [
      createEvent({ kind: "meta", name: "session.meta", data: { x: 1 } }, { id: "a", ts: 1 }),
      createEvent({ kind: "error", name: "boom", data: {} }, { id: "b", ts: 2, level: "error" }),
    ];
    const decoded = decodeEvents(encodeEvents(events));
    expect(decoded).toEqual(events);
  });

  it("round-trips through JSON string form", () => {
    const events = [
      createEvent({ kind: "metric", name: "metric.tokens", data: { name: "tokens", value: 42 } }, { id: "m1", ts: 5 }),
    ];
    const json = serializeCompact(events);
    expect(typeof json).toBe("string");
    expect(parseCompact(json)).toEqual(events);
  });

  it("compact form is smaller than full JSON", () => {
    const events = [
      createEvent(
        { kind: "message", name: "message.assistant", data: { role: "assistant", content: "hello world" } },
        { id: "evt_long_id", ts: 1700000000000, parentId: "span_1", spanId: "span_2" },
      ),
    ];
    const full = JSON.stringify(events);
    const compact = serializeCompact(events);
    // Tuple form drops 7 key strings per event → strictly smaller.
    expect(compact.length).toBeLessThan(full.length);
  });

  it("preserves null parentId", () => {
    const evt = createEvent({ kind: "meta", name: "x", data: {} }, { id: "e1", ts: 0, parentId: null });
    expect(decodeEvent(encodeEvent(evt)).parentId).toBeNull();
  });

  it("preserves nested data payloads", () => {
    const payload = { deep: { nested: { array: [1, 2, { x: "y" }] } } };
    const evt = createEvent({ kind: "action", name: "act", data: payload }, { id: "e2", ts: 0 });
    expect(decodeEvent(encodeEvent(evt)).data).toEqual(payload);
  });
});
