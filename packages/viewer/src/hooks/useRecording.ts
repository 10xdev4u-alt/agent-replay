/**
 * useRecording — loads a .replay.jsonl file and exposes time-travel state.
 *
 * Wraps core's ReplayEngine behind a React hook so components can scrub
 * the timeline, inspect state at any cursor, and jump to specific events.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReplayEngine, type AgentEvent, type ReplayState } from "@agent-replay/core";

export interface RecordingSource {
  /** URL or path to the .replay.jsonl file. */
  url: string;
}

export interface RecordingState {
  /** All events, loaded. */
  events: AgentEvent[];
  /** Current cursor index (exclusive — state shows events[0..cursor)). */
  cursor: number;
  /** Derived state at the current cursor. */
  state: ReplayState;
  /** True while loading or streaming events. */
  loading: boolean;
  /** Error message if the load failed. */
  error: string | null;
  /** Move the cursor. Clamped to [0, events.length]. */
  seek: (n: number) => void;
  /** Jump to the end (full replay). */
  seekEnd: () => void;
  /** Jump to the start. */
  seekStart: () => void;
  /** Step forward/back by N events. */
  step: (delta: number) => void;
  /** True when cursor === events.length. */
  isAtEnd: boolean;
}

export function useRecording(source: RecordingSource | null): RecordingState {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      setEvents([]);
      setCursor(0);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(source.url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed: AgentEvent[] = [];
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            parsed.push(JSON.parse(trimmed) as AgentEvent);
          } catch {
            // Skip malformed lines — lenient like the core reader.
          }
        }
        parsed.sort((a, b) => a.ts - b.ts);
        setEvents(parsed);
        setCursor(parsed.length);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source?.url]);

  const engine = useMemo(() => new ReplayEngine(events), [events]);

  const seek = useCallback(
    (n: number) => setCursor(Math.max(0, Math.min(n, engine.length))),
    [engine.length],
  );
  const seekEnd = useCallback(() => setCursor(engine.length), [engine.length]);
  const seekStart = useCallback(() => setCursor(0), []);
  const step = useCallback(
    (delta: number) => setCursor((c) => Math.max(0, Math.min(c + delta, engine.length))),
    [engine.length],
  );

  const state = useMemo(() => engine.at(cursor), [engine, cursor]);

  return {
    events,
    cursor,
    state,
    loading,
    error,
    seek,
    seekEnd,
    seekStart,
    step,
    isAtEnd: cursor >= engine.length,
  };
}
