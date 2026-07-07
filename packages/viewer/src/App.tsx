/**
 * App — the viewer shell.
 *
 * Loads a recording (via ?src= query or file drop), drives the replay
 * cursor, and lays out: Toolbar on top, Timeline + Conversation + Inspector.
 */
import { useState, useCallback } from "react";
import { useRecording, type RecordingSource } from "./hooks/useRecording.js";
import { usePlayer } from "./hooks/usePlayer.js";
import { Timeline } from "./components/Timeline.js";
import { Conversation } from "./components/Conversation.js";
import { EventInspector } from "./components/EventInspector.js";
import type { AgentEvent } from "@agent-replay/core";
import styles from "./App.module.css";

export default function App() {
  const [source, setSource] = useState<RecordingSource | null>(readSourceFromUrl());
  const rec = useRecording(source);
  const { events, cursor, state, loading, error } = rec;
  const { isPlaying, speed, toggle, setSpeed } = usePlayer(rec);
  const [selected] = useState<AgentEvent | null>(null);

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
        </div>
      </header>

      {loading && <div className={styles.banner}>loading…</div>}
      {error && <div className={styles.banner + " " + styles.error}>{error}</div>}

      {events.length === 0 && !loading && !error && (
        <div className={styles.empty}>
          <p>Drop a <code>.replay.jsonl</code> file, or load one with <code>?src=</code>.</p>
        </div>
      )}

      {events.length > 0 && (
        <div className={styles.body}>
          <Timeline events={events} cursor={cursor} onCursor={rec.seek} />
          <div className={styles.main}>
            <Conversation messages={state.messages} cursor={cursor} />
            <EventInspector event={selected ?? events[cursor - 1] ?? null} />
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
