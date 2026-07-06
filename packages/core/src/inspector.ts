/**
 * Inspector — derives a compact summary of a recording.
 *
 * Used by the viewer's sidebar and the CLI's `info` command. Answers
 * "what happened in this run?" in a few numbers: how long, how many
 * events, how many errors, how many tokens, what providers/tools ran.
 */
import { ROOT_SPAN } from "./constants.js";
import type { AgentEvent, EventKind } from "./types.js";

/** Summary of a single tool's usage within a recording. */
export interface ToolUsage {
  name: string;
  calls: number;
  /** First ts seen. */
  firstAt: number;
  /** Last ts seen. */
  lastAt: number;
  /** Number of tool_result events with kind error, if detectable. */
  errors: number;
}

/** Summary of a model provider's usage. */
export interface ProviderUsage {
  name: string;
  prompts: number;
  responses: number;
  tokens: number;
}

/** Compact recording summary — the viewer's "at a glance" panel. */
export interface RecordingSummary {
  /** Total events. */
  eventCount: number;
  /** Count per event kind. */
  byKind: Record<EventKind, number>;
  /** Count per severity. */
  bySeverity: Record<string, number>;
  /** Wall-clock duration in ms (first→last event). */
  durationMs: number;
  /** Distinct spans opened. */
  spanCount: number;
  /** Max nesting depth of spans. */
  maxDepth: number;
  /** Tool call summaries, sorted by call count desc. */
  tools: ToolUsage[];
  /** Provider summaries, sorted by prompt count desc. */
  providers: ProviderUsage[];
  /** Total tokens if metric events were emitted. */
  totalTokens: number;
  /** Total cost (USD) if metric events were emitted. */
  totalCost: number;
  /** Error count. */
  errorCount: number;
  /** First event ts. */
  startedAt: number | null;
  /** Last event ts. */
  endedAt: number | null;
}

const EMPTY_BY_KIND: Record<EventKind, number> = {
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
 * Compute a recording summary from an event list.
 *
 * O(n) single pass, no allocations beyond the accumulators. Safe on
 * large recordings.
 */
export function summarize(events: readonly AgentEvent[]): RecordingSummary {
  const byKind = { ...EMPTY_BY_KIND };
  const bySeverity: Record<string, number> = {};
  const tools = new Map<string, ToolUsage>();
  const providers = new Map<string, ProviderUsage>();
  const spanDepth = new Map<string, number>();
  let totalTokens = 0;
  let totalCost = 0;
  let errorCount = 0;
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let maxDepth = 0;

  for (const evt of events) {
    byKind[evt.kind] = (byKind[evt.kind] ?? 0) + 1;
    bySeverity[evt.level] = (bySeverity[evt.level] ?? 0) + 1;

    if (startedAt === null || evt.ts < startedAt) startedAt = evt.ts;
    if (endedAt === null || evt.ts > endedAt) endedAt = evt.ts;

    if (evt.spanId && evt.spanId !== ROOT_SPAN) {
      const parentDepth = evt.parentId ? (spanDepth.get(evt.parentId) ?? 0) : 0;
      const depth = parentDepth + 1;
      spanDepth.set(evt.spanId, depth);
      if (depth > maxDepth) maxDepth = depth;
    }

    switch (evt.kind) {
      case "tool_call": {
        const name = stripSuffix(evt.name, ".result");
        const t = tools.get(name) ?? { name, calls: 0, firstAt: evt.ts, lastAt: evt.ts, errors: 0 };
        t.calls++;
        t.lastAt = evt.ts;
        tools.set(name, t);
        break;
      }
      case "tool_result": {
        const name = stripSuffix(evt.name, ".result");
        const t = tools.get(name) ?? { name, calls: 0, firstAt: evt.ts, lastAt: evt.ts, errors: 0 };
        if (evt.level === "error") t.errors++;
        tools.set(name, t);
        break;
      }
      case "prompt": {
        const p = providers.get(evt.name) ?? { name: evt.name, prompts: 0, responses: 0, tokens: 0 };
        p.prompts++;
        providers.set(evt.name, p);
        break;
      }
      case "response": {
        const p = providers.get(evt.name) ?? { name: evt.name, prompts: 0, responses: 0, tokens: 0 };
        p.responses++;
        providers.set(evt.name, p);
        break;
      }
      case "metric": {
        const data = evt.data as { name?: string; value?: number };
        if (data.name === "tokens" && typeof data.value === "number") totalTokens += data.value;
        if (data.name === "cost" && typeof data.value === "number") totalCost += data.value;
        break;
      }
      case "error": {
        errorCount++;
        break;
      }
      default:
        break;
    }
  }

  const durationMs = startedAt !== null && endedAt !== null ? endedAt - startedAt : 0;

  return {
    eventCount: events.length,
    byKind,
    bySeverity,
    durationMs,
    spanCount: spanDepth.size,
    maxDepth,
    tools: [...tools.values()].sort((a, b) => b.calls - a.calls),
    providers: [...providers.values()].sort((a, b) => b.prompts - a.prompts),
    totalTokens,
    totalCost,
    errorCount,
    startedAt,
    endedAt,
  };
}

/** Find the event at or just before a given wall-clock timestamp. */
export function findEventAtTimestamp(events: readonly AgentEvent[], ts: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].ts <= ts) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function stripSuffix(s: string, suffix: string): string {
  return s.endsWith(suffix) ? s.slice(0, -suffix.length) : s;
}
