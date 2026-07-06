/**
 * Core event schema — the atomic unit of an agent recording.
 *
 * Every observable thing an agent does (a prompt, a tool call, a token,
 * an error) is an AgentEvent. Replays reconstruct state from these.
 */

/** Severity level for an event. Maps to standard log levels. */
export type Severity = "debug" | "info" | "warn" | "error" | "fatal";

/** Category of event. Drives the viewer's filtering and iconography. */
export type EventKind =
  | "meta" // session metadata (name, version, env)
  | "message" // user/assistant/system message
  | "prompt" // raw prompt sent to a model
  | "response" // raw model response (full)
  | "delta" // streamed token/chunk
  | "tool_call" // agent invoked a tool
  | "tool_result" // tool returned a value
  | "thought" // agent's internal reasoning (CoT)
  | "action" // side-effect (file write, http call)
  | "error" // something failed
  | "metric" // measurement (tokens, latency, cost)
  | "checkpoint" // explicit replay marker
  | "custom"; // user-defined

/** Role for message-kind events. */
export type Role = "user" | "assistant" | "system" | "tool" | "developer";

/**
 * The universal event record. Stored as one line per event in JSONL.
 * Keep it flat and serializable — these get gzipped and shipped.
 */
export interface AgentEvent<TData = unknown> {
  /** Monotonic, unique within a recording. Used as the timeline id. */
  id: string;
  /** Wall-clock time the event was emitted, ms since epoch. */
  ts: number;
  /** Logical category — drives viewer rendering. */
  kind: EventKind;
  /** Free-form name, e.g. "openai.chat.completions.create". */
  name: string;
  /** Severity for filtering and surfacing failures. */
  level: Severity;
  /** Span id this event belongs to (groups related events). */
  spanId: string;
  /** Parent span id, for nesting. Root events have null here. */
  parentId: string | null;
  /** The payload. Shape depends on `kind`. */
  data: TData;
}

/** Marker type so callers can type-narrow on `kind`. */
export interface TypedEvent<K extends EventKind, T = unknown>
  extends Omit<AgentEvent<T>, "kind"> {
  kind: K;
}
