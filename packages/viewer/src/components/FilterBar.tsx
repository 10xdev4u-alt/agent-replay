/**
 * FilterBar — search and filter the event list.
 *
 * Free-text search across name + data, plus quick toggles for kind (multi).
 * Drives a predicate pipeline through core's filters so the viewer can
 * narrow down to "all errors", "the prompt where X happened", etc.
 */
import { memo, useState } from "react";
import { EVENT_KINDS, type EventKind } from "@agent-replay/core";
import styles from "./FilterBar.module.css";

interface Props {
  /** Current free-text query. */
  query: string;
  /** Called on every keystroke with the new query. */
  onQuery: (q: string) => void;
  /** Active kind filters (multi-select). Empty = all kinds. */
  activeKinds: Set<EventKind>;
  /** Called when the active kind set changes. */
  onKinds: (kinds: Set<EventKind>) => void;
  /** Count of events matching the current filter. */
  matched: number;
  /** Total event count (for the result hint). */
  total: number;
}

function FilterBarImpl({ query, onQuery, activeKinds, onKinds, matched, total }: Props) {
  const [focused, setFocused] = useState(false);

  const toggleKind = (kind: EventKind) => {
    const next = new Set(activeKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onKinds(next);
  };

  return (
    <div className={styles.bar}>
      <input
        className={styles.input}
        type="search"
        placeholder="search events…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="search events"
      />
      <div className={styles.kinds} role="group" aria-label="filter by kind">
        {EVENT_KINDS.map((kind) => {
          const active = activeKinds.has(kind);
          return (
            <button
              key={kind}
              type="button"
              className={styles.kind + (active ? ` ${styles.kindActive}` : "")}
              data-kind={kind}
              onClick={() => toggleKind(kind)}
              aria-pressed={active}
            >
              {kind}
            </button>
          );
        })}
      </div>
      <span className={styles.hint + (focused ? ` ${styles.hintFocused}` : "")}>
        {query || activeKinds.size > 0
          ? `${matched} / ${total}`
          : `${total} events`}
      </span>
    </div>
  );
}

export const FilterBar = memo(FilterBarImpl);
