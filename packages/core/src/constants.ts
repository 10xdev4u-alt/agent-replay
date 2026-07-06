/**
 * Shared constants for event kinds, severities, and protocol versions.
 * Single source of truth — import from here, never hardcode strings.
 */

/** Protocol/format version. Bump on breaking recording format changes. */
export const PROTOCOL_VERSION = "0.1.0" as const;

/** All valid event kinds as a tuple, for runtime validation. */
export const EVENT_KINDS = [
  "meta",
  "message",
  "prompt",
  "response",
  "delta",
  "tool_call",
  "tool_result",
  "thought",
  "action",
  "error",
  "metric",
  "checkpoint",
  "custom",
] as const;

/** All valid severity levels as a tuple, for runtime validation. */
export const SEVERITIES = [
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
] as const;

/** Default span id for root events. */
export const ROOT_SPAN = "root";

/** Monotonic counter seed. */
export const DEFAULT_SEQ_SEED = 0;

/** File extensions. */
export const RECORDING_EXT = ".replay.jsonl";
export const ARCHIVE_EXT = ".replay";
