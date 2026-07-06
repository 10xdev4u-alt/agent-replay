/**
 * Replay engine — reconstructs agent state from a sequence of events.
 *
 * Given a sorted event list, it builds a derived "state" at any cursor
 * position: messages exchanged, spans opened/closed, tokens accumulated,
 * errors seen. This is the core of the viewer's scrubber.
 *
 * Determinism rule: state is a pure function of `events.slice(0, cursor)`.
 * Same events + same cursor → identical state. No time leaks.
 */
import { ROOT_SPAN } from "./constants.js";
import type { AgentEvent, EventKind, Role } from "./types.js";

/** A chat message reconstructed from message/prompt/response events. */
export interface ReplayMessage {
  id: string;
  role: Role;
  content: unknown;
  /** Events that contributed to this message (deltas, prompt, etc.). */
  sources: string[];
  ts: number;
}

/** A reconstructed span with its child events. */
export interface ReplaySpan {
  id: string;
  parentId: string | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  eventIds: string[];
}

/** Snapshot of agent state at a given cursor position. */
export interface ReplayState {
  /** Cursor index into the event list (exclusive). */
  cursor: number;
  /** Wall-clock span of the visible events. */
  startedAt: number | null;
  endedAt: number | null;
  /** Reconstructed conversation. */
  messages: ReplayMessage[];
  /** Open + closed spans within the visible window. */
  spans: ReplaySpan[];
  /** Aggregated token count if metric events are present. */
  tokens: number;
  /** Aggregated cost estimate (USD) if metric events are present. */
  cost: number;
  /** Count by kind, for quick filtering badges. */
  counts: Record<EventKind, number>;
  /** Error events in the visible window. */
  errors: AgentEvent[];
}

const EMPTY_COUNTS: Record<EventKind, number> = {
  meta: 0,
  message: 0,
  prompt: 0,
  response: 0,
  delta: 0,
  tool_call: 0,
  tool_result: 0,
  thought: 0,
  action: 0,
  error: 0,
  metric: 0,
  checkpoint: 0,
  custom: 0,
};

/**
 * Build a replay engine over a sorted event list. Events are not mutated;
 * the engine only reads.
 */
export class ReplayEngine {
  constructor(private readonly events: readonly AgentEvent[]) {}

  /** Total event count. */
  get length(): number {
    return this.events.length;
  }

  /** Reconstruct state at cursor `n` (shows events[0..n)). */
  at(n: number): ReplayState {
    const cursor = clamp(n, 0, this.events.length);
    const visible = this.events.slice(0, cursor);

    const counts = { ...EMPTY_COUNTS };
    const messages = new Map<string, ReplayMessage>();
    const spans = new Map<string, ReplaySpan>();
    let tokens = 0;
    let cost = 0;
    const errors: AgentEvent[] = [];

    for (const evt of visible) {
      counts[evt.kind] = (counts[evt.kind] ?? 0) + 1;

      // Spans: record start (and we trust endedAt comes via span events later).
      if (evt.spanId && evt.spanId !== ROOT_SPAN && !spans.has(evt.spanId)) {
        spans.set(evt.spanId, {
          id: evt.spanId,
          parentId: evt.parentId,
          name: spanNameFromEvent(evt),
          startedAt: evt.ts,
          endedAt: null,
          eventIds: [],
        });
      }
      spans.get(evt.spanId ?? ROOT_SPAN)?.eventIds.push(evt.id);

      switch (evt.kind) {
        case "message": {
          const data = evt.data as { role?: Role; content?: unknown };
          const role = data.role ?? "assistant";
          const existing = messages.get(evt.id);
          if (existing) {
            existing.content = data.content;
          } else {
            messages.set(evt.id, {
              id: evt.id,
              role,
              content: data.content,
              sources: [evt.id],
              ts: evt.ts,
            });
          }
          break;
        }
        case "delta": {
          // Attach deltas to the latest assistant message if any.
          const last = lastValue(messages);
          if (last && last.role === "assistant") {
            last.content = appendDelta(last.content, evt.data);
            last.sources.push(evt.id);
          }
          break;
        }
        case "metric": {
          const data = evt.data as { name?: string; value?: number };
          if (data.name === "tokens" && typeof data.value === "number") tokens += data.value;
          if (data.name === "cost" && typeof data.value === "number") cost += data.value;
          break;
        }
        case "error": {
          errors.push(evt);
          break;
        }
        default:
          break;
      }
    }

    return {
      cursor,
      startedAt: visible[0]?.ts ?? null,
      endedAt: visible[visible.length - 1]?.ts ?? null,
      messages: [...messages.values()],
      spans: [...spans.values()],
      tokens,
      cost,
      counts,
      errors,
    };
  }

  /** State at the end of the recording (all events visible). */
  final(): ReplayState {
    return this.at(this.events.length);
  }

  /** Find the index of the first event matching a predicate. */
  indexOf(predicate: (e: AgentEvent) => boolean): number {
    return this.events.findIndex(predicate);
  }

  /** All events (read-only). */
  list(): readonly AgentEvent[] {
    return this.events;
  }
}

/** Helpers */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lastValue<T>(map: Map<unknown, T>): T | undefined {
  let v: T | undefined;
  for (const value of map.values()) v = value;
  return v;
}

function appendDelta(content: unknown, delta: unknown): unknown {
  if (typeof delta === "string") return typeof content === "string" ? content + delta : delta;
  if (Array.isArray(content)) return [...content, delta];
  return content;
}

function spanNameFromEvent(evt: AgentEvent): string {
  return evt.name || evt.spanId || "span";
}
