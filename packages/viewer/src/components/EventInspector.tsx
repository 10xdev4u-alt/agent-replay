/**
 * EventInspector — detail panel for a single selected event.
 *
 * Shows the event's kind, name, timestamp, span, and a tree view of its
 * data payload. The "deep dive" view when you click an event on the timeline.
 */
import { useState } from "react";
import type { AgentEvent } from "@agent-replay/core";
import { formatKind } from "../utils/format.js";

interface Props {
  event: AgentEvent | null;
}

export function EventInspector({ event }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["data"]));

  if (!event) {
    return (
      <aside className="inspector inspector-empty">
        <p>Select an event to inspect.</p>
      </aside>
    );
  }

  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  return (
    <aside className="inspector">
      <header className="inspector-head">
        <span className={`badge badge-${event.kind}`}>{formatKind(event.kind)}</span>
        <h3>{event.name}</h3>
      </header>

      <dl className="inspector-meta">
        <dt>id</dt>
        <dd><code>{event.id}</code></dd>
        <dt>ts</dt>
        <dd>{new Date(event.ts).toISOString()}</dd>
        <dt>level</dt>
        <dd><code>{event.level}</code></dd>
        <dt>span</dt>
        <dd><code>{event.spanId}</code></dd>
        {event.parentId && (
          <>
            <dt>parent</dt>
            <dd><code>{event.parentId}</code></dd>
          </>
        )}
      </dl>

      <section className="inspector-payload">
        <button className="payload-toggle" onClick={() => toggle("data")}>
          {expanded.has("data") ? "▾" : "▸"} data
        </button>
        {expanded.has("data") && (
          <pre className="payload-json">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        )}
      </section>
    </aside>
  );
}
