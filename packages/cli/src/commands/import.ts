/**
 * import — expand a .replay archive back to a .replay.jsonl.
 *
 * Lets you inspect/share the raw events after receiving a portable archive.
 * Inverse of `export`.
 */
import { resolve, basename } from "node:path";
import { writeFile } from "node:fs/promises";
import { readArchive, type AgentEvent } from "@agent-replay/core";

export async function importCmd(args: string[]): Promise<number> {
  const [file, outArg] = args;
  if (!file) {
    console.error("usage: agent-replay import <file.replay> [out.replay.jsonl]");
    return 1;
  }

  const path = resolve(file);
  try {
    const { meta, events } = await readArchive(path);
    const outPath = resolve(outArg ?? `${basename(file, ".replay")}.replay.jsonl`);
    const lines = events.map((e: AgentEvent) => JSON.stringify(e)).join("\n") + "\n";
    await writeFile(outPath, lines);
    console.error(`◆ ${events.length} events → ${outPath}`);
    if (Object.keys(meta).length) console.error(`  meta: ${JSON.stringify(meta)}`);
    return 0;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
