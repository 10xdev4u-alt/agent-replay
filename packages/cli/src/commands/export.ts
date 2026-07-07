/**
 * export — pack a .replay.jsonl recording into a portable .replay archive.
 *
 * Reads JSONL, gzips it with the archive container, writes .replay.
 * Single shareable artifact.
 */
import { resolve, basename } from "node:path";
import { readAll, writeArchive } from "@agent-replay/core";

export async function exportCmd(args: string[]): Promise<number> {
  const [infile, outfileArg] = args;
  if (!infile) {
    console.error("usage: agent-replay export <file.replay.jsonl> [out.replay]");
    return 1;
  }

  const inPath = resolve(infile);
  const { events } = await readAll(inPath);
  if (events.length === 0) {
    console.error(`no events in ${inPath}`);
    return 1;
  }

  const outPath = resolve(outfileArg ?? basename(inPath).replace(/\.replay\.jsonl$/, ".replay"));
  const meta = (events[0]?.data as Record<string, unknown>) ?? {};
  await writeArchive(outPath, events, meta);

  console.log(`exported ${events.length} events → ${outPath}`);
  return 0;
}
