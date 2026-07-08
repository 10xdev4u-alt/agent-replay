/**
 * merge — stitch multiple recordings into one.
 *
 * Reads N .replay.jsonl or .replay files, re-stamps ids + timestamps so
 * there are no collisions, and writes a single merged recording. Keeps the
 * first source's meta event, drops the rest.
 */
import { resolve, basename } from "node:path";
import { writeFile } from "node:fs/promises";
import { readAll, readArchive, mergeRecordings, type MergeSource } from "@agent-replay/core";

const REPLAY_EXT = /(\.replay\.jsonl|\.replay)$/;

export async function merge(args: string[]): Promise<number> {
  if (args.length < 2) {
    console.error("usage: agent-replay merge <a.replay.jsonl> <b.replay.jsonl>... [out.replay.jsonl]");
    console.error("       (last arg is the output path)");
    return 1;
  }

  const inputs = args.slice(0, -1);
  const outArg = args[args.length - 1];

  try {
    const sources: MergeSource[] = [];
    for (const f of inputs) {
      const path = resolve(f);
      const { events } = await readWithFallback(path);
      sources.push({ name: basename(f).replace(REPLAY_EXT, "") || "src", events });
    }

    const merged = mergeRecordings(sources);
    const outPath = resolve(outArg);
    const lines = merged.map((e: import("@agent-replay/core").AgentEvent) => JSON.stringify(e)).join("\n") + "\n";
    await writeFile(outPath, lines);
    console.error(`◆ merged ${sources.length} recordings (${merged.length} events) → ${outPath}`);
    return 0;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

/** Read jsonl or a gzipped archive, transparently. */
async function readWithFallback(path: string): Promise<{ events: import("@agent-replay/core").AgentEvent[] }> {
  if (path.endsWith(".replay")) {
    const { events } = await readArchive(path);
    return { events };
  }
  return readAll(path);
}
