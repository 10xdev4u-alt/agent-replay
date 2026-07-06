/**
 * Span tracker — groups related events under a shared trace context.
 *
 * A "span" is a logical unit of work. A tool call spawns a span; the
 * tool_call + tool_result + any inner deltas all share its spanId.
 * Spans nest via parentId to form a tree the viewer can collapse.
 */
import { createIdFactory } from "./factory.js";
import { ROOT_SPAN } from "./constants.js";
import type { Clock } from "./factory.js";

/** A span's identity + timing. */
export interface Span {
  id: string;
  parentId: string | null;
  /** Logical name, e.g. "tool:read_file" or "model.openai.chat". */
  name: string;
  /** Start ts (ms). */
  startedAt: number;
  /** End ts, or null if still open. */
  endedAt: number | null;
}

/** Options when starting a span. */
export interface StartSpanOptions {
  name?: string;
  parentId?: string | null;
  startedAt?: number;
}

/**
 * SpanTracker keeps a stack so callers can `start()`/`end()` without
 * threading ids manually. The current span is the parent of new events.
 */
export class SpanTracker {
  private readonly idGen: () => string;
  private readonly clock: Clock;
  private readonly spans = new Map<string, Span>();
  private readonly stack: string[] = [];

  constructor(idGen?: () => string, clock?: Clock) {
    this.idGen = idGen ?? createIdFactory("span");
    this.clock = clock ?? (() => Date.now());
  }

  /** Begin a span. Becomes the current parent until `end()` is called. */
  start(opts: StartSpanOptions = {}): Span {
    const id = this.idGen();
    const parentId = opts.parentId ?? this.current()?.id ?? null;
    const span: Span = {
      id,
      parentId,
      name: opts.name ?? "span",
      startedAt: opts.startedAt ?? this.clock(),
      endedAt: null,
    };
    this.spans.set(id, span);
    this.stack.push(id);
    return span;
  }

  /** End the current (or named) span and record its finish time. */
  end(id?: string): Span | undefined {
    const targetId = id ?? this.stack.pop();
    if (targetId === undefined) return undefined;
    const span = this.spans.get(targetId);
    if (!span) return undefined;
    span.endedAt = this.clock();
    // If we ended a specific id, also pop it from the stack if present.
    if (id && this.stack[this.stack.length - 1] === targetId) {
      this.stack.pop();
    }
    uncached;
    return span;
  }

  /** Look up a span by id. */
  get(id: string): Span | undefined {
    return this.spans.get(id);
  }

  /** The span new events should attach to. */
  current(): Span | undefined {
    const id = this.stack[this.stack.length - 1];
    return id ? this.spans.get(id) : undefined;
  }

  /** True if `id` is the root span (or undefined). */
  isRoot(id?: string | null): boolean {
    return !id || id === ROOT_SPAN;
  }

  /** All spans, in creation order. Useful for viewer timeline. */
  all(): Span[] {
    return [...this.spans.values()];
  }

  /** Drop everything. Used by the recorder on reset. */
  clear(): void {
    this.spans.clear();
    this.stack.length = 0;
  }
}
