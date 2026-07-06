/**
 * Event filters — composable predicate builders for slicing recordings.
 *
 * The viewer chains these into a pipeline: kind filter → time range →
 * text search → span membership. All pure functions over AgentEvent.
 */
import { ROOT_SPAN } from "./constants.js";
import type { AgentEvent, EventKind, Severity } from "./types.js";

export type EventPredicate = (e: AgentEvent) => boolean;

/** Logical AND across predicates. No predicates = match-all. */
export function all(...preds: EventPredicate[]): EventPredicate {
  return (e) => preds.every((p) => p(e));
}

/** Logical OR across predicates. */
export function any(...preds: EventPredicate[]): EventPredicate {
  return (e) => preds.some((p) => p(e));
}

/** Negate a predicate. */
export function not(pred: EventPredicate): EventPredicate {
  return (e) => !pred(e);
}

/** Match events of one or more kinds. */
export function byKind(...kinds: EventKind[]): EventPredicate {
  const set = new Set(kinds);
  return (e) => set.has(e.kind);
}

/** Match events at or above a severity threshold. */
export function byMinSeverity(min: Severity): EventPredicate {
  const order: Severity[] = ["debug", "info", "warn", "error", "fatal"];
  const floor = order.indexOf(min);
  return (e) => order.indexOf(e.level) >= floor;
}

/** Match events within [start, end] (ms since epoch). */
export function byTimeRange(start?: number, end?: number): EventPredicate {
  return (e) =>
    (start === undefined || e.ts >= start) &&
    (end === undefined || e.ts <= end);
}

/** Match events whose name matches a substring (case-insensitive). */
export function byName(query: string): EventPredicate {
  const q = query.toLowerCase();
  return (e) => e.name.toLowerCase().includes(q);
}

/** Match events whose JSON data contains a substring (case-insensitive). */
export function byData(query: string): EventPredicate {
  const q = query.toLowerCase();
  return (e) => {
    try {
      return JSON.stringify(e.data).toLowerCase().includes(q);
    } catch {
      return false;
    }
  };
}

/** Free-text search across name + data. */
export function byText(query: string): EventPredicate {
  if (!query) return () => true;
  return any(byName(query), byData(query));
}

/** Match events belonging to a span (by id), excluding the root span. */
export function bySpan(spanId: string): EventPredicate {
  return (e) => e.spanId === spanId && e.spanId !== ROOT_SPAN;
}

/** Match root-level events (no span or the root span). */
export function isRoot(): EventPredicate {
  return (e) => e.spanId === ROOT_SPAN || !e.spanId;
}

/** Match events whose id is in the given set. */
export function byId(...ids: string[]): EventPredicate {
  const set = new Set(ids);
  return (e) => set.has(e.id);
}

/** Apply a predicate to a list. Pure — returns a new array. */
export function filterEvents(
  events: readonly AgentEvent[],
  pred: EventPredicate,
): AgentEvent[] {
  return events.filter(pred);
}

/** Count events matching a predicate. */
export function countEvents(
  events: readonly AgentEvent[],
  pred: EventPredicate,
): number {
  let n = 0;
  for (const e of events) if (pred(e)) n++;
  return n;
}
