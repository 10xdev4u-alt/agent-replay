/**
 * Merge — stitch multiple recordings into one contiguous event stream.
 *
 * Why: when you run an agent in stages (or across machines) and want a
 * single replay covering the whole thing. Each source keeps its internal
 * ordering; we re-stamp ids + timestamps so there are no collisions and
 * the merged timeline reads as one run.
 *
 * Ids get a per-source prefix so they stay unique. Timestamps are offset
 * so each source starts where the previous ended — preserving relative
 * spacing within a source while making the whole thing monotonic.
 */
import { createIdFactory } from "./factory.js";
import type { AgentEvent } from "./types.js";

export interface MergeOptions {
  /** Drop the per-source meta events (keep only the first). Default: true. */
  dropMeta?: boolean;
}

export interface MergeSource {
  /** Source label, used as the id prefix. */
  name: string;
  events: readonly AgentEvent[];
}

/** Merge multiple sources into one monotonic event stream. */
export function mergeRecordings(
  sources: readonly MergeSource[],
  opts: MergeOptions = {},
): AgentEvent[] {
  const dropMeta = opts.dropMeta ?? true;
  const out: AgentEvent[] = [];
  let cursor = 0;
  let firstMetaKept = false;

  for (const src of sources) {
    if (src.events.length === 0) continue;
    const base = src.events[0].ts;
    const idGen = createIdFactory(src.name);

    for (const evt of src.events) {
      if (dropMeta && evt.kind === "meta") {
        if (firstMetaKept) continue;
        firstMetaKept = true;
      }
      out.push({
        ...evt,
        id: idGen(),
        ts: cursor + (evt.ts - base),
      });
    }
    cursor += src.events[src.events.length - 1].ts - base + 1;
  }

  return out;
}
