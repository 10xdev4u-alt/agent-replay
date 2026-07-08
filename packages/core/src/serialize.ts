/**
 * Compact serialization — key-shortened JSON for smaller archives.
 *
 * The archive format already gzips, but long key names ("parentId",
 * "spanId", "startedAt") survive compression poorly in small files and
 * bloat in-memory size. This maps the verbose AgentEvent shape to a
 * short-keyed tuple/array form for the wire, and back.
 *
 * Round-trip lossless with `decode(encode(events))`.
 */
import type { AgentEvent } from "./types.js";

/**
 * Compact event shape: fixed-position fields, short keys for data.
 * [id, ts, kind, name, level, spanId, parentId, data]
 */
export type CompactEvent = [
  id: string,
  ts: number,
  kind: AgentEvent["kind"],
  name: string,
  level: AgentEvent["level"],
  spanId: string,
  parentId: string | null,
  data: unknown,
];

/** Encode a full event to its compact tuple form. */
export function encodeEvent(evt: AgentEvent): CompactEvent {
  return [evt.id, evt.ts, evt.kind, evt.name, evt.level, evt.spanId, evt.parentId, evt.data];
}

/** Decode a compact tuple back to a full event. */
export function decodeEvent(compact: CompactEvent): AgentEvent {
  const [id, ts, kind, name, level, spanId, parentId, data] = compact;
  return { id, ts, kind, name, level, spanId, parentId, data };
}

/** Encode a list of events. */
export function encodeEvents(events: readonly AgentEvent[]): CompactEvent[] {
  return events.map(encodeEvent);
}

/** Decode a list of compact events. */
export function decodeEvents(compact: readonly CompactEvent[]): AgentEvent[] {
  return compact.map(decodeEvent);
}

/** Serialize to a compact JSON string. */
export function serializeCompact(events: readonly AgentEvent[]): string {
  return JSON.stringify(encodeEvents(events));
}

/** Parse a compact JSON string back to events. */
export function parseCompact(json: string): AgentEvent[] {
  const parsed = JSON.parse(json) as CompactEvent[];
  return decodeEvents(parsed);
}
