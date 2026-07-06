/**
 * Timeline — the showpiece scrubber.
 *
 * Renders one bar per event, color-coded by kind. Click/drag to scrub.
 * Uses CSS transforms (translateX/scaleX) — GPU-composited, no canvas,
 * no per-frame React reconciliation for the bars themselves.
 */
import { memo, useCallback, useRef } from "react";
import type { AgentEvent, EventKind } from "@agent-replay/core";
import styles from "./Timeline.module.css";

const KIND_COLOR: Record<EventKind, string> = {
  meta: "#6b7280",
  message: "#06b6d4",
  prompt: "#a855f7",
  response: "#c026d3",
  delta: "#475569",
  tool_call: "#f59e0b",
  tool_result: "#10b981",
  thought: "#3b82f6",
  action: "#3b82f6",
  error: "#ef4444",
  metric: "#6b7280",
  checkpoint: "#6b7280",
  custom: "#6b7280",
};

interface TimelineProps {
  events: readonly AgentEvent[];
  cursor: number;
  onCursor: (n: number) => void;
  /** Currently highlighted span id, or null. */
  activeSpanId?: string | null;
}

export const Timeline = memo(function Timeline({
  events,
  cursor,
  onCursor,
  activeSpanId,
}: TimelineProps) {
  const ref = useRef<HTMLDivElement>(null);

  const eventAt = useCallback(
    (clientX: number): number => {
      const el = ref.current;
      if (!el || events.length === 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(events.length - 1, Math.floor(ratio * events.length)));
    },
    [events],
  );

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      if (events.length === 0) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onCursor(eventAt(e.clientX));
    },
    [events, onCursor, eventAt],
  );

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      // Only scrub while a button is held.
      if (e.buttons === 0) return;
      onCursor(eventAt(e.clientX));
    },
    [onCursor, eventAt],
  );

  if (events.length === 0) {
    return <div className={styles.empty}>no events</div>;
  }

  return (
    <div
      ref={ref}
      className={styles.track}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={events.length - 1}
      aria-valuenow={cursor}
      aria-label="timeline scrubber"
    >
      {events.map((evt, i) => {
        const isInActiveSpan = activeSpanId && evt.spanId === activeSpanId;
        return (
          <div
            key={evt.id}
            className={styles.bar}
            data-past={i < cursor ? "" : undefined}
            data-active-span={isInActiveSpan ? "" : undefined}
            style={{ ["--bar-color" as string]: KIND_COLOR[evt.kind] ?? "#6b7280" }}
          />
        );
      })}
      <div
        className={styles.cursor}
        style={{ transform: `translateX(${(cursor / events.length) * 100}%)` }}
      />
    </div>
  );
});
