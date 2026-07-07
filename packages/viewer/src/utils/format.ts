/** Formatting helpers for the viewer. Pure functions, no deps. */
import type { EventKind, Role } from "@agent-replay/core";

/** Human-readable event kind for badges. */
export function formatKind(kind: EventKind): string {
  return kind.replace("_", " ");
}

/** Capitalize a role for display. */
export function formatRole(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Relative time label like "+1.23s" from a base timestamp. */
export function relTime(ts: number, base: number): string {
  return `+${((ts - base) / 1000).toFixed(2)}s`;
}

/** Byte size formatter. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
