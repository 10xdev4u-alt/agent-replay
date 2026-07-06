/**
 * JSONL reader — parses a recording file back into AgentEvents.
 *
 * Streaming and tolerant: validates shape, skips malformed lines with a
 * warning, and yields events as they arrive rather than buffering the file.
 * Mirrors JsonlWriter so a round trip is lossless.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { AgentEvent } from "./types.js";

/** File stat alias used across reader/inspector. */
export interface StatLike {
  size: number;
  mtimeMs: number;
}

export interface ReadOptions {
  /** Abort the read mid-stream. */
  signal?: AbortSignal;
  /** Skip malformed lines instead of throwing. Default: true. */
  lenient?: boolean;
}

/** Result of a full read. */
export interface ReadResult {
  events: AgentEvent[];
  /** Lines that failed validation, with the error. */
  dropped: Array<{ line: number; error: string }>;
}

/** Promise wrapper around fs.stat with a friendly error if missing. */
export async function existsStat(path: string): Promise<StatLike> {
  try {
    return await stat(path);
  } catch {
    throw new Error(`recording not found: ${path}`);
  }
}

/**
 * Stream-parse a recording file line by line. Each parsed event is passed
 * to `onEvent` as soon as it's decoded.
 */
export async function readStreaming(
  path: string,
  onEvent: (event: AgentEvent) => void,
  opts: ReadOptions = {},
): Promise<ReadResult> {
  const lenient = opts.lenient ?? true;
  const dropped: ReadResult["dropped"] = [];

  const stream = createReadStream(path, { encoding: "utf8" });
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => stream.destroy());
  }

  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as AgentEvent;
      if (!isValidEvent(parsed)) {
        throw new Error("event failed shape validation");
      }
      onEvent(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!lenient) {
        throw new Error(`line ${lineNumber}: ${msg}`);
      }
      dropped.push({ line: lineNumber, error: msg });
    }
  }

  return { events: [], dropped };
}

/** Read an entire recording into memory. */
export async function readAll(path: string, opts: ReadOptions = {}): Promise<ReadResult> {
  const events: AgentEvent[] = [];
  const result = await readStreaming(path, (e) => events.push(e), opts);
  return { events, dropped: result.dropped };
}

/** Minimal runtime shape check for a parsed event. */
export function isValidEvent(value: unknown): value is AgentEvent {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.ts === "number" &&
    typeof e.kind === "string" &&
    typeof e.name === "string" &&
    typeof e.level === "string" &&
    typeof e.spanId === "string" &&
    (e.parentId === null || typeof e.parentId === "string")
  );
}
