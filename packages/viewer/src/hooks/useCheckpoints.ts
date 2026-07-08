/**
 * useCheckpoints — bookmark moments in a recording and jump between them.
 *
 * Checkpoints are persisted per-recording (keyed by source URL) in
 * localStorage, so bookmarks survive reloads. Power feature for anyone
 * debugging a specific moment across sessions.
 */
import { useCallback, useEffect, useState } from "react";

export interface Checkpoint {
  /** Event index this bookmark points at. */
  cursor: number;
  /** User label. */
  label: string;
  /** Created timestamp (ms). */
  createdAt: number;
}

const STORAGE_PREFIX = "agent-replay:checkpoints:";

function key(source: string): string {
  return STORAGE_PREFIX + source;
}

function load(source: string): Checkpoint[] {
  try {
    const raw = localStorage.getItem(key(source));
    return raw ? (JSON.parse(raw) as Checkpoint[]) : [];
  } catch {
    return [];
  }
}

function save(source: string, list: Checkpoint[]): void {
  try {
    localStorage.setItem(key(source), JSON.stringify(list));
  } catch {
    // storage full / disabled — checkpoints just won't persist
  }
}

export interface CheckpointState {
  checkpoints: Checkpoint[];
  add: (cursor: number, label?: string) => void;
  remove: (index: number) => void;
  clear: () => void;
  /** Cursor of the previous checkpoint before the given cursor. */
  previous: (cursor: number) => number | null;
  /** Cursor of the next checkpoint after the given cursor. */
  next: (cursor: number) => number | null;
}

export function useCheckpoints(sourceUrl: string | null): CheckpointState {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  useEffect(() => {
    setCheckpoints(sourceUrl ? load(sourceUrl) : []);
  }, [sourceUrl]);

  const persist = useCallback(
    (list: Checkpoint[]) => {
      setCheckpoints(list);
      if (sourceUrl) save(sourceUrl, list);
    },
    [sourceUrl],
  );

  const add = useCallback(
    (cursor: number, label?: string) => {
      const cp: Checkpoint = {
        cursor,
        label: label ?? `checkpoint @ ${cursor}`,
        createdAt: Date.now(),
      };
      // Insert in cursor order; replace an existing one at the same cursor.
      const next = checkpoints.filter((c) => c.cursor !== cursor);
      next.push(cp);
      next.sort((a, b) => a.cursor - b.cursor);
      persist(next);
    },
    [checkpoints, persist],
  );

  const remove = useCallback(
    (index: number) => {
      persist(checkpoints.filter((_, i) => i !== index));
    },
    [checkpoints, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const previous = useCallback(
    (cursor: number): number | null => {
      let result: number | null = null;
      for (const c of checkpoints) {
        if (c.cursor < cursor) result = c.cursor;
        else break;
      }
      return result;
    },
    [checkpoints],
  );

  const next = useCallback(
    (cursor: number): number | null => {
      for (const c of checkpoints) {
        if (c.cursor > cursor) return c.cursor;
      }
      return null;
    },
    [checkpoints],
  );

  return { checkpoints, add, remove, clear, previous, next };
}
