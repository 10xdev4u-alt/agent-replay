/**
 * convert — auto-detect input format and convert to the other.
 *
 * .replay.jsonl → .replay archive, or .replay → .replay.jsonl. Sniffs the
 * first bytes to decide. Convenience over explicit export/import.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  readAll,
  writeArchive,
  readArchive,
  ARCHIVE_EXT,
} from "@agent-replay/core";

const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

export async function convert(args: string[]): Promise<number> {
  const [inArg, outArg] = args;
  if (!inArg) {
    console.error("usage: agent-replay convert <in> [out]");
    console.error("  auto-detects .replay.jsonl ↔ .replay and converts");
    return 1;
  }

  const inPath = resolve(inArg);
  const buf = await readFile(inPath);

  // Sniff gzip magic to decide direction.
  const isGz = buf[0] === GZIP_MAGIC_0 && buf[1] === GZIP_MAGIC_1;

  if (isGz) {
    // archive → jsonl
    const outPath = resolve(outArg ?? inPath.replace(/\.replay$/, ".replay.jsonl"));
    const { events, meta } = await readArchive(inPath);
    const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outPath, lines);
    console.error(`◆ ${events.length} events → ${outPath}`);
    if (Object.keys(meta).length) console.error(`  meta: ${JSON.stringify(meta)}`);
    return 0;
  }

  // jsonl → archive
  const outPath = resolve(outArg ?? inPath.replace(/\.replay\.jsonl$/, ARCHIVE_EXT));
  const { events } = await readAll(inPath);
  if (events.length === 0) {
    console.error("no events found in input");
    return 1;
  }
  await writeArchive(outPath, events);
  console.error(`◆ ${events.length} events → ${outPath}`);
  return 0;
}
