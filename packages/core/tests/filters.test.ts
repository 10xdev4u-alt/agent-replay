/**
 * Filters unit tests — verify predicate combinators and kind/time/text filters.
 */
import { describe, it, expect } from "vitest";
import { createEvent } from "../src/factory.js";
import {
  all,
  any,
  not,
  byKind,
  byMinSeverity,
  byTimeRange,
  byText,
  bySpan,
  isRoot,
  filterEvents,
  countEvents,
} from "../src/filters.js";
import { ROOT_SPAN } from "../src/constants.js";

const base = { ts: 1000 };

describe("filter combinators", () => {
  it("all() matches when every predicate passes", () => {
    const ev = createEvent({ kind: "error", name: "boom", data: { x: 1 } }, base);
    const isErr = byKind("error");
    const hasX = byText("boom");
    expect(all(isErr, hasX)(ev)).toBe(true);
    expect(all(isErr, byText("nope"))(ev)).toBe(false);
  });

  it("any() matches when at least one passes", () => {
    const ev = createEvent({ kind: "message", name: "hi", data: {} }, base);
    expect(any(byKind("error"), byKind("message"))(ev)).toBe(true);
    expect(any(byKind("error"), byKind("prompt"))(ev)).toBe(false);
  });

  it("not() negates", () => {
    const ev = createEvent({ kind: "message", name: "hi", data: {} }, base);
    expect(not(byKind("error"))(ev)).toBe(true);
    expect(not(byKind("message"))(ev)).toBe(false);
  });
});

describe("kind and severity filters", () => {
  it("byKind matches one of several kinds", () => {
    const err = createEvent({ kind: "error", name: "e", data: {} }, base);
    const msg = createEvent({ kind: "message", name: "m", data: {} }, base);
    const pred = byKind("error", "tool_call");
    expect(pred(err)).toBe(true);
    expect(pred(msg)).toBe(false);
  });

  it("byMinSeverity thresholds inclusive", () => {
    const warn = createEvent({ kind: "message", name: "w", data: {} }, { ...base, level: "warn" });
    const info = createEvent({ kind: "message", name: "i", data: {} }, { ...base, level: "info" });
    expect(byMinSeverity("warn")(warn)).toBe(true);
    expect(byMinSeverity("warn")(info)).toBe(false);
  });
});

describe("time and text filters", () => {
  it("byTimeRange respects start and end bounds", () => {
    const e1 = createEvent({ kind: "message", name: "a", data: {} }, { ...base, ts: 500 });
    const e2 = createEvent({ kind: "message", name: "b", data: {} }, { ...base, ts: 1500 });
    const pred = byTimeRange(1000, 2000);
    expect(pred(e2)).toBe(true);
    expect(pred(e1)).toBe(false);
  });

  it("byText searches name and data", () => {
    const ev = createEvent({ kind: "tool_call", name: "read_file", data: { path: "/tmp/x" } }, base);
    expect(byText("read")(ev)).toBe(true);
    expect(byText("/tmp/x")(ev)).toBe(true);
    expect(byText("nope")(ev)).toBe(false);
  });
});

describe("span filters", () => {
  it("bySpan matches a non-root span id", () => {
    const ev = createEvent(
      { kind: "tool_call", name: "t", data: {} },
      { ...base, spanId: "span_1" },
    );
    expect(bySpan("span_1")(ev)).toBe(true);
    expect(bySpan(ROOT_SPAN)(ev)).toBe(false);
  });

  it("isRoot matches root or empty span", () => {
    const root = createEvent({ kind: "message", name: "m", data: {} }, base);
    const child = createEvent(
      { kind: "message", name: "c", data: {} },
      { ...base, spanId: "span_1" },
    );
    expect(isRoot()(root)).toBe(true);
    expect(isRoot()(child)).toBe(false);
  });
});

describe("filterEvents and countEvents", () => {
  const events = [
    createEvent({ kind: "error", name: "e1", data: {} }, base),
    createEvent({ kind: "message", name: "m1", data: {} }, base),
    createEvent({ kind: "error", name: "e2", data: {} }, base),
  ];

  it("filterEvents returns a new filtered array", () => {
    const errs = filterEvents(events, byKind("error"));
    expect(errs).toHaveLength(2);
    expect(events).toHaveLength(3); // original untouched
  });

  it("countEvents counts without allocating", () => {
    expect(countEvents(events, byKind("error"))).toBe(2);
    expect(countEvents(events, byKind("message"))).toBe(1);
  });
});
