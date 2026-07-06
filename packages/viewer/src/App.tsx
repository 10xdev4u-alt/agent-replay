import { useState, useCallback } from "react";
import type { AgentEvent } from "@agent-replay/core";
import { ReplayEngine } from "@agent-replay/core";
import { Timeline } from "./components/Timeline.js";
import { Inspector } from "./components/Inspector.js";
import { Playback } from "./components/Playback.js";
import { Toolbar } from "./components/Toolbar.js";
import { useRecordingLoader } from "./hooks/useRecordingLoader.js";
import styles from "./App.module.css";

export default function App() {
  const { events, meta, source, error, load } = useRecordingLoader();
  const [cursor, setCursor] = useState(0);
  const engine = events.length > 0 ? new ReplayEngine(events) : null;
  const state = engine?.at(cursor) ?? null;
  const finalState = engine?.final() ?? null;

  const jump = useCallback(
    (n: number) => {
      const max = events.length;
      setCursor(Math.max(0, Math.min(max, n)));
    },
    [events.length],
  );

  return (
    <div className={styles.app}>
      <Toolbar
        source={source}
        meta={meta}
        eventCount={events.length}
        onDrop={load}
      />
      {error ? (
        <div className={styles.error}>{error}</div>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          Drop a <code>.replay.jsonl</code> file, or pass <code>?src=</code> URL.
        </div>
      ) : (
        <div className={styles.body}>
          <Timeline
            events={events}
            cursor={cursor}
            onSeek={jump}
            counts={state?.counts}
          />
          <div className={styles.main}>
            <Playback
              state={state}
              cursor={cursor}
              total={events.length}
              onJump={jump}
            />
            <Inspector
              state={state}
              finalState={finalState}
              events={events}
              cursor={cursor}
              onJump={jump}
            />
          </div>
        </div>
      )}
    </div>
  );
}
