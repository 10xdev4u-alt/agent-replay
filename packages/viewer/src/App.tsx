/**
 * App — the viewer shell.
 *
 * Loads a recording (via ?src= query or file drop), drives the replay
 * cursor, and lays out: Toolbar on top, Timeline + Conversation + Inspector.
 */
import { useState, useCallback } from "react";
import { useRecording, type RecordingSource } from "./hooks/useRecording.js";
import { usePlayer } from "./hooks/usePlayer.js";
import { useTheme } from "./hooks/useTheme.js";
import { Timeline } from "./components/Timeline.js";
import { Conversation } from "./components/Conversation.js";
import { EventInspector } from "./components/EventInspector.js";
import { StatsPanel } from "./components/StatsPanel.js";
import { FilterBar } from "./components/FilterBar.js";
import { SpanTree } from "./components/SpanTree.js";
import { KeyboardHelp } from "./components/KeyboardHelp.js";
import { ThemeToggle } from "./components/ThemeToggle.js";
import { summarize } from "@agent-replay/core";
import type { AgentEvent, EventKind } from "@agent-replay/core";
import styles from "./App.module.css";

export default function App() {
  const [source, setSource] = useState<RecordingSource | null>(readSourceFromUrl());
  const rec = useRecording(source);
  const { events, cursor, state, loading, error } = rec;
  const { isPlaying, speed, toggle, setSpeed } = usePlayer(rec);
  const [selected] = useState<AgentEvent | null>(null);
  const [query, setQuery] = useState("");
  const [activeKinds, setActiveKinds] = useState<Set<EventKind>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  useTheme();

  const visibleEvents: readonly AgentEvent[] =
    query || activeKinds.size
      ? events.filter((e) => {
          if (activeKinds.size && !activeKinds.has(e.kind)) return false;
          if (!query) return true;
          try {
            return JSON.stringify(e.data).toLowerCase().includes(query.toLowerCase()) ||
              e.name.toLowerCase().includes(query.toLowerCase());
          } catch {
            return false;
          }
        })
      : events;

  const onDrop = useCallback(async (file: File) => {
    const text = await file.text();
    const url = URL.createObjectURL(new Blob([text], { type: "application/jsonl" }));
    setSource({ url });
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.toolbar}>
        <h1 className={styles.title}>
          <span className={styles.logo}>◐</span> agent-replay
        </h1>
        <div className={styles.source}>
          {source ? (
            <span className={styles.loaded}>● {events.length} events</span>
          ) : (
            <label className={styles.dropzone}>
              drop a <code>.replay.jsonl</code> file
              <input
                type="file"
                accept=".jsonl,.replay"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onDrop(f);
                }}
                hidden
              />
            </label>
          )}
        </div>
        <div className={styles.controls}>
          <button onClick={rec.seekStart} disabled={!events.length} title="start (Home)">⏮</button>
          <button onClick={() => rec.step(-1)} disabled={!events.length} title="back (←)">◀</button>
          <button onClick={toggle} disabled={!events.length} title="play/pause (space)" className={styles.play}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={() => rec.step(1)} disabled={!events.length} title="forward (→)">▶</button>
          <button onClick={rec.seekEnd} disabled={!events.length} title="end (End)">⏭</button>
          <button onClick={() => setSpeed(speed >= 4 ? 0.25 : speed * 2)} title="speed (+/-)" className={styles.speed}>{speed}×</button>
          <span className={styles.counter}>{cursor} / {events.length}</span>
          <button onClick={() => setShowHelp((v) => !v)} title="keyboard shortcuts (?)" className={styles.help}>?</button>
          <ThemeToggle />
        </div>
      </header>

      {showHelp && <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />}

      {loading && <div className={styles.banner}>loading…</div>}
      {error && <div className={styles.banner + " " + styles.error}>{error}</div>}

      {events.length === 0 && !loading && !error && (
        <div className={styles.empty}>
          <p>Drop a <code>.replay.jsonl</code> file, or load one with <code>?src=</code>.</p>
        </div>
      )}

      {events.length > 0 && (
        <div className={styles.body}>
          <FilterBar
            query={query}
            onQuery={setQuery}
            activeKinds={activeKinds}
            onKinds={setActiveKinds}
            matched={visibleEvents.length}
            total={events.length}
          />
          <Timeline events={visibleEvents} cursor={Math.min(cursor, visibleEvents.length)} onCursor={rec.seek} />
          <div className={styles.main}>
            <Conversation messages={state.messages} cursor={cursor} />
            <div className={styles.sidebar}>
              <StatsPanel summary={summarize(events)} />
              <SpanTree spans={state.spans} activeId={state.spans[state.spans.length - 1]?.id ?? null} onSelect={(id) => { const idx = events.findIndex((e) => e.spanId === id); if (idx >= 0) rec.seek(idx + 1); }} />
              <EventInspector event={selected ?? events[cursor - 1] ?? null} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function readSourceFromUrl(): RecordingSource | null {
  if (typeof window === "undefined") return null;
  const src = new URLSearchParams(window.location.search).get("src");
  return src ? { url: src } : null;
}
