/**
 * Diff — compare two recordings and surface what changed.
 *
 * "Why did the agent do something different this time?" answered by
 * diffing two event streams: which spans appear/missing, which tool calls
 * diverged, where token counts differ. Output is structured so the viewer
 * (or a CI check) can render a clear before/after.
 *
 * Aligns runs by a configurable key (default: event name + kind) so
 * reordered-but-equivalent runs aren't flagged as wildly different.
 */
import type { AgentEvent } from "./types.js";
import { summarize, type RecordingSummary } from "./inspector.js";

/** The kind of structural change between two aligned events. */
export type DiffChange =
  | "added" // only in the right (new) run
  | "removed" // only in the left (base) run
  | "changed" // present in both but payloads differ
  | "same"; // aligned and identical

/** A single aligned pair, or a lone event from one side. */
export interface DiffEntry {
  change: DiffChange;
  /** Alignment key (name + kind by default). */
  key: string;
  /** Base (left) event, or null if added. */
  left: AgentEvent | null;
  /** New (right) event, or null if removed. */
  right: AgentEvent | null;
  /** True if token/cost metrics diverged. */
  metricsDiverged: boolean;
}

/** Summary of a full two-run diff. */
export interface RecordingDiff {
  /** Per-event alignment, in key order. */
  entries: DiffEntry[];
  /** Counts per change kind. */
  counts: Record<DiffChange, number>;
  /** Base run summary. */
  leftSummary: RecordingSummary;
  /** New run summary. */
  rightSummary: RecordingSummary;
  /** Delta in total token cost (right - left), USD. */
  costDelta: number;
  /** Delta in total tokens (right - left). */
  tokenDelta: number;
  /** Delta in wall-clock duration (right - left), ms. */
  durationDeltaMs: number;
}

/** Build a key for aligning events across runs. Override to align differently. */
export type DiffKeyFn = (e: AgentEvent) => string;
export const defaultDiffKey: DiffKeyFn = (e) => `${e.kind}:${e.name}`;

const EMPTY_COUNTS: Record<DiffChange, number> = {
  added: 0,
  removed: 0,
  changed: 0,
  same: 0,
};

/**
 * Diff two recordings. Events are grouped by key (ordered first occurrence),
 * then paired left↔right. A key present on only one side is added/removed.
 */
export function diffRecordings(
  left: readonly AgentEvent[],
  right: readonly AgentEvent[],
  keyFn: DiffKeyFn = defaultDiffKey,
): RecordingDiff {
  const leftByKey = groupByKey(left, keyFn);
  const rightByKey = groupByKey(right, keyFn);

  const keys = new Set<string>([...leftByKey.keys(), ...rightByKey.keys()]);
  const entries: DiffEntry[] = [];
  const counts = { ...EMPTY_COUNTS };

  for (const key of keys) {
    const l = leftByKey.get(key) ?? null;
    const r = rightByKey.get(key) ?? null;
    const change: DiffChange = !l ? "added" : !r ? "removed" : samePayload(l, r) ? "same" : "changed";
    counts[change]++;
    entries.push({
      change,
      key,
      left: l,
      right: r,
      metricsDiverged: !!l && !!r && metricsDiffer(l, r),
    });
  }

  const leftSummary = summarize(left);
  const rightSummary = summarize(right);

  return {
    entries,
    counts,
    leftSummary,
    rightSummary,
    costDelta: rightSummary.totalCost - leftSummary.totalCost,
    tokenDelta: rightSummary.totalTokens - leftSummary.totalTokens,
    durationDeltaMs: rightSummary.durationMs - leftSummary.durationMs,
  };
}

function groupByKey(events: readonly AgentEvent[], keyFn: DiffKeyFn): Map<string, AgentEvent> {
  const map = new Map<string, AgentEvent>();
  for (const e of events) {
    const k = keyFn(e);
    if (!map.has(k)) map.set(k, e);
  }
  return map;
}

function samePayload(a: AgentEvent, b: AgentEvent): boolean {
  try {
    return JSON.stringify(a.data) === JSON.stringify(b.data);
  } catch {
    return false;
  }
}

function metricsDiffer(a: AgentEvent, b: AgentEvent): boolean {
  if (a.kind !== "metric" || b.kind !== "metric") return false;
  const da = a.data as { value?: number };
  const db = b.data as { value?: number };
  return typeof da.value === "number" && typeof db.value === "number" && da.value !== db.value;
}
