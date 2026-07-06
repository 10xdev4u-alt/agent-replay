/**
 * JSONL writer — persists AgentEvents line-by-line to a recording file.
 *
 * One event per line, newline-delimited JSON. Trivially streamable,
 * gzip-friendly, and recoverable: if a process crashes mid-run, everything
 * already flushed is safe on disk.
 */
import { createWriteStream, type WriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { AgentEvent } from "./types.js";

export interface WriterOptions {
  /** Buffer up to N events before flushing to disk. */
  flushEvery?: number;
  /** Overwrite an existing file instead of appending. */
  truncate?: boolean;
}

/**
 * Streaming JSONL sink. Pipe a Recorder into it with `recorder.on(writer.write)`.
 */
export class JsonlWriter {
  private stream: WriteStream | null = null;
  private buffer: AgentEvent[] = [];
  private readonly flushEvery: number;
  private readonly truncate: boolean;

  constructor(
    private readonly path: string,
    opts: WriterOptions = {},
  ) {
    this.flushEvery = opts.flushEvery ?? 1;
    this.truncate = opts.truncate ?? false;
  }

  /** Open the destination file. Idempotent — safe to call twice. */
  async open(): Promise<void> {
    if (this.stream) return;
    await mkdir(dirname(this.path), { recursive: true });
    const flags = this.truncate ? "w" : "a";
    this.stream = createWriteStream(this.path, { flags });
  }

  /** Write one event (buffered by flushEvery). Returns once on disk. */
  async write(event: AgentEvent): Promise<void> {
    if (!this.stream) await this.open();
    this.buffer.push(event);
    if (this.buffer.length >= this.flushEvery) {
      await this.flush();
    }
  }

  /** Flush the buffer to the underlying stream. */
  async flush(): Promise<void> {
    if (!this.stream || this.buffer.length === 0) return;
    const lines = this.buffer.map((e) => JSON.stringify(e)).join("\n") + "\n";
    this.buffer.length = 0;
    await new Promise<void>((resolve, reject) => {
      this.stream!.write(lines, (err) => (err ? reject(err) : resolve()));
    });
  }

  /** Close the writer. Always call on shutdown. */
  async close(): Promise<void> {
    await this.flush();
    if (!this.stream) return;
    await new Promise<void>((resolve) => this.stream!.end(resolve));
    this.stream = null;
  }
}
