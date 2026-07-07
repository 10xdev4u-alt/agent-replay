/**
 * Archive — portable .replay format.
 *
 * A .replay file is a gzipped JSON document bundling the event list + the
 * session meta, so a recording is fully self-describing and shareable as
 * a single artifact. No external deps — uses Node's built-in zlib.
 */
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import type { AgentEvent } from "./types.js";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const ARCHIVE_MAGIC = "ARPL"; // first 4 bytes of a valid .replay file

/** The on-disk structure inside a .replay archive. */
export interface ArchivePayload {
  magic: typeof ARCHIVE_MAGIC;
  version: 1;
  meta: Record<string, unknown>;
  events: AgentEvent[];
}

/** Serialize events + meta to a gzipped .replay buffer. */
export async function toArchive(
  events: readonly AgentEvent[],
  meta: Record<string, unknown> = {},
): Promise<Buffer> {
  const payload: ArchivePayload = {
    magic: ARCHIVE_MAGIC,
    version: 1,
    meta,
    events: [...events],
  };
  const json = JSON.stringify(payload);
  return gzipAsync(json);
}

/** Deserialize a gzipped .replay buffer back to events + meta. */
export async function fromArchive(buf: Buffer): Promise<ArchivePayload> {
  const json = (await gunzipAsync(buf)).toString("utf8");
  const payload = JSON.parse(json) as ArchivePayload;
  if (payload.magic !== ARCHIVE_MAGIC) {
    throw new Error(`not an agent-replay archive (bad magic: ${payload.magic})`);
  }
  if (payload.version !== 1) {
    throw new Error(`unsupported archive version: ${payload.version}`);
  }
  return payload;
}

/** Write a .replay archive to disk. */
export async function writeArchive(
  path: string,
  events: readonly AgentEvent[],
  meta: Record<string, unknown> = {},
): Promise<void> {
  const buf = await toArchive(events, meta);
  await writeFile(path, buf);
}

/** Read a .replay archive from disk. */
export async function readArchive(path: string): Promise<ArchivePayload> {
  const buf = await readFile(path);
  return fromArchive(buf);
}

/** Sniff a buffer to check if it looks like a .replay archive. Best-effort:
 * tries gunzip + parse; any failure = not an archive. */
export async function isArchive(buf: Buffer): Promise<boolean> {
  try {
    const payload = await fromArchive(buf);
    return payload.magic === ARCHIVE_MAGIC;
  } catch {
    return false;
  }
}
