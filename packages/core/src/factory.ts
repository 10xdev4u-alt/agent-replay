/**
 * Event factory — guarantees every emitted event is well-formed.
 *
 * Centralizing creation here means the recorder, SDK wrappers, and tests
 * all produce identical shapes. Never `new` an event by hand.
 */
import type { AgentEvent, EventKind, Severity } from "./types.js";
import { DEFAULT_SEQ_SEED, ROOT_SPAN } from "./constants.js";

/** Incrementing id generator. Wraps a closure so callers can't desync it. */
export function createIdFactory(prefix = "evt"): () => string {
  let n = DEFAULT_SEQ_SEED;
  return () => `${prefix}_${(++n).toString(36)}`;
}

/** Default timestamp source — overridable in tests for determinism. */
export type Clock = () => number;
export const defaultClock: Clock = () => Date.now();

/** Optional knobs for event creation. */
export interface CreateEventOptions {
  /** Override the auto-generated id. */
  id?: string;
  /** Override the wall-clock timestamp (ms). */
  ts?: number;
  /** Span id. Defaults to the root span. */
  spanId?: string;
  /** Parent span id. `null` = root. */
  parentId?: string | null;
  /** Severity. Defaults to `info`. */
  level?: Severity;
}

/** Required fields for building an event. */
export interface EventInput<T = unknown> {
  kind: EventKind;
  name: string;
  data: T;
}

/**
 * Build a single event. The factory owns id + ts sequencing so callers
 * never have to think about uniqueness or ordering.
 */
export function createEvent<T>(
  input: EventInput<T>,
  opts: CreateEventOptions = {},
  idGen: () => string = createIdFactory(),
  clock: Clock = defaultClock,
): AgentEvent<T> {
  return {
    id: opts.id ?? idGen(),
    ts: opts.ts ?? clock(),
    kind: input.kind,
    name: input.name,
    level: opts.level ?? "info",
    spanId: opts.spanId ?? ROOT_SPAN,
    parentId: opts.parentId ?? null,
    data: input.data,
  };
}

/** Convenience: a root meta event describing a recording session. */
export function createMetaEvent(meta: Record<string, unknown>): AgentEvent {
  return createEvent(
    { kind: "meta", name: "session.meta", data: meta },
    { level: "info" },
  );
}
