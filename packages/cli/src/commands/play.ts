/**
 * play — render a recording as a readable timeline to stdout.
 *
 * The text-mode replay: walks events in order, prints each with a relative
 * timestamp, kind badge, and a short data preview. This is the "watch the
 * agent think" view for the terminal.
 */
import { resolve } from "node:path";
import { readAll } from "@agent-replay/core";
import type { AgentEvent } from "@agent-replay/core";
import { EVENT_KINDS } from "@agent-replay/core";

const KIND_BADGE: Record<string, string> = {
  meta: "\x1b[90mMETA\x1b[0m",
  message: "\x1b[36mMSG \x1b[0m",
  prompt: "\x1b[35mPRMT\x1b[0m",
  response: "\x1b[35mRSP \x1b[0m",
  delta: "\x1b[90mDLT \x1b[0m",
  tool_call: "\x1b[33mCALL\x1b[0m",
  tool_result: "\x1b[32mRSLT\x1b[0m",
  thought: "\x1b[34mTHGT\x1b[0m",
  action: "\x1b[34mACT \x1b[0m",
  error: "\x1b[31mERR \x1b[0m",
  metric: "\x1b[90mMETR\x1b[0m",
  checkpoint: "\x1b[90mCHCK\x1b[0m",
  custom: "\x1b[90mCSTM\x1b[0m",
};

export async function play(args: string[]): Promise<number> {
  const [file] = args;
  if (!file) {
    console.error("usage: agent-replay play <file.replay.jsonl>");
    return 1;
  }

  const { events } = await readAll(resolve(file));
  if (events.length === 0) {
    console.error("no events to play");
    return 1;
  }

  const t0 = events[0].ts;
  for (const evt of events) {
    printEvent(evt, t0);
  }
  return 0;
}

function printEvent(evt: AgentEvent, t0: number): void {
  const rel = ((evt.ts - t0) / 1000).toFixed(2).padStart(7, " ");
  const badge = KIND_BADGE[evt.kind] ?? evt.kind.toUpperCase().slice(0, 4);
  const name = evt.name.padEnd(32, " ").slice(0, 32);
  const preview = previewData(evt.data, evt.kind);
  console.log(`+${rel}s ${badge} ${name} ${preview}`);
}

function previewData(data: unknown, kind: string): string {
  let text: string;
  try {
    text = typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    text = String(data);
  }
  // Messages: show just the content.
  if (kind === "message" && data && typeof data === "object") {
    const d = data as { content?: unknown };
    if (typeof d.content === "string") text = d.content;
  }
  const max = 72;
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Keep EVENT_KINDS referenced for tree-shake-safe badge coverage assertions.
void EVENT_KINDS;
