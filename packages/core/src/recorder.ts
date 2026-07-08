/**
 * Recorder — the heart of agent-replay.
 *
 * Wraps an agent run, emits AgentEvents, and writes them as JSONL. One
 * recorder = one recording file. Drop it around any agent loop.
 */
import { EventEmitter } from "node:events";
import { createEvent, createIdFactory, createMetaEvent, defaultClock, type Clock, type CreateEventOptions } from "./factory.js";
import { SpanTracker, type Span } from "./spans.js";
import type { AgentEvent, EventKind } from "./types.js";

/** Listener invoked on every emitted event. */
export type EventSink = (event: AgentEvent) => void;

/** Listener invoked when the recorder flushes events to a sink. */
export interface RecorderOptions {
  /** Recording name (goes into the meta event). */
  name?: string;
  /** Custom clock (tests). */
  clock?: Clock;
  /** Called for every event as it is emitted. */
  sink?: EventSink;
  /** Auto-cap an event payload above this byte size (default 64KB). */
  maxPayloadBytes?: number;
}

/** Default payload cap. Prevents one giant blob from blowing up a replay. */
export const DEFAULT_MAX_PAYLOAD = 64 * 1024;

export class Recorder {
  readonly events: AgentEvent[] = [];
  readonly spans: SpanTracker;
  readonly startedAt: number;
  private readonly clock: Clock;
  private readonly sink?: EventSink;
  private readonly maxPayloadBytes: number;
  private readonly idGen = createIdFactory("evt");
  private ended = false;
  private readonly emitter = new EventEmitter();

  constructor(opts: RecorderOptions = {}) {
    this.clock = opts.clock ?? defaultClock;
    this.spans = new SpanTracker(createIdFactory("span"), this.clock);
    this.sink = opts.sink;
    this.maxPayloadBytes = opts.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD;
    this.startedAt = this.clock();
    // Seed the recording with a meta event describing the session.
    this.emitRaw(
      createMetaEvent({
        name: opts.name ?? "agent-run",
        protocol: "0.1.0",
        startedAt: this.startedAt,
      }),
    );
  }

  /** Subscribe to every emitted event. Returns an unsubscribe fn. */
  on(listener: EventSink): () => void {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }

  /** Emit a typed event. */
  event(kind: EventKind, name: string, data: unknown, opts: CreateEventOptions = {}): AgentEvent {
    const span = this.spans.current();
    const evt = createEvent(
      { kind, name, data: this.cap(data) },
      {
        ...opts,
        spanId: opts.spanId ?? span?.id,
        parentId: opts.parentId ?? span?.parentId,
      },
      this.idGen,
      this.clock,
    );
    return this.emitRaw(evt);
  }

  /** Shortcut helpers for the common kinds. */
  message(role: string, content: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("message", `message.${role}`, { role, content }, opts);
  }
  prompt(provider: string, payload: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("prompt", `prompt.${provider}`, payload, opts);
  }
  response(provider: string, payload: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("response", `response.${provider}`, payload, opts);
  }
  delta(chunk: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("delta", "delta", chunk, opts);
  }
  thought(content: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("thought", "thought", content, opts);
  }
  toolCall(tool: string, args: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("tool_call", `tool.${tool}`, args, opts);
  }
  toolResult(tool: string, result: unknown, opts?: CreateEventOptions): AgentEvent {
    return this.event("tool_result", `tool.${tool}.result`, result, opts);
  }
  error(err: unknown, opts?: CreateEventOptions): AgentEvent {
    const data = err instanceof Error ? { message: err.message, stack: err.stack, name: err.name } : { message: String(err) };
    return this.event("error", "error", data, { level: "error", ...opts });
  }
  metric(name: string, value: number, opts?: CreateEventOptions): AgentEvent {
    return this.event("metric", `metric.${name}`, { name, value }, opts);
  }

  /** Open a span. Returns a handle that closes on call. */
  span(name: string): { id: string; end: () => Span } {
    const span = this.spans.start({ name });
    const spans = this.spans;
    return {
      id: span.id,
      end: () => spans.end(span.id) ?? span,
    };
  }

  /** Finalize the recording. Returns the full event list. */
  end(): AgentEvent[] {
    if (this.ended) return this.events;
    this.ended = true;
    return this.events;
  }

  /** Reset — mostly for tests. */
  clear(): void {
    this.events.length = 0;
    this.spans.clear();
    this.ended = false;
  }

  private emitRaw(evt: AgentEvent): AgentEvent {
    this.events.push(evt);
    this.emitter.emit("event", evt);
    this.sink?.(evt);
    return evt;
  }

  /** Cap oversized payloads so one bad tool result can't break a replay. */
  private cap(data: unknown): unknown {
    if (this.maxPayloadBytes <= 0) return data;
    try {
      const json = JSON.stringify(data);
      if (json.length <= this.maxPayloadBytes) return data;
      return {
        __truncated: true,
        preview: json.slice(0, this.maxPayloadBytes),
        originalBytes: json.length,
      };
    } catch {
      return { __truncated: true, preview: String(data).slice(0, this.maxPayloadBytes) };
    }
  }
}
