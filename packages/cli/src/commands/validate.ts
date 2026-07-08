/**
 * validate — integrity-check a recording file.
 *
 * Goes beyond JSON shape: flags duplicate ids, out-of-order timestamps,
 * spans whose parent never appeared, and orphaned events. Exits non-zero
 * if any problems are found, so it works as a CI gate.
 */
import { resolve } from "node:path";
import { readAll } from "@agent-replay/core";
import { SEVERITIES, EVENT_KINDS } from "@agent-replay/core";

export async function validate(args: string[]): Promise<number> {
  const [file] = args;
  if (!file) {
    console.error("usage: agent-replay validate <file.replay.jsonl>");
    return 1;
  }

  const path = resolve(file);
  const { events, dropped } = await readAll(path, { lenient: true });

  const problems: string[] = [];

  // Dropped / malformed lines.
  for (const d of dropped) {
    problems.push(`line ${d.line}: malformed — ${d.error}`);
  }

  // Duplicate ids.
  const seenIds = new Set<string>();
  for (const e of events) {
    if (seenIds.has(e.id)) problems.push(`duplicate id: ${e.id}`);
    seenIds.add(e.id);
  }

  // Unknown kind / level values.
  const kindSet = new Set(EVENT_KINDS);
  const sevSet = new Set(SEVERITIES);
  for (const e of events) {
    if (!kindSet.has(e.kind as never)) problems.push(`${e.id}: unknown kind '${e.kind}'`);
    if (!sevSet.has(e.level as never)) problems.push(`${e.id}: unknown level '${e.level}'`);
  }

  // Out-of-order timestamps.
  let prevTs = -Infinity;
  for (const e of events) {
    if (e.ts < prevTs) problems.push(`${e.id}: timestamp out of order (ts=${e.ts})`);
    prevTs = e.ts;
  }

  // Orphaned parents: parentId references a spanId that never appeared.
  const spanIds = new Set(events.map((e) => e.spanId));
  for (const e of events) {
    if (e.parentId && !spanIds.has(e.parentId)) {
      problems.push(`${e.id}: parent span '${e.parentId}' never appeared`);
    }
  }

  console.log(`recording: ${path}`);
  console.log(`events:    ${events.length}`);
  console.log(`problems:  ${problems.length}`);

  if (problems.length === 0) {
    console.log("✓ valid");
    return 0;
  }
  console.log("\ndetails:");
  for (const p of problems.slice(0, 50)) console.log(`  ✗ ${p}`);
  if (problems.length > 50) console.log(`  …and ${problems.length - 50} more`);
  return 1;
}
