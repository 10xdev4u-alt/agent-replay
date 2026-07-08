/**
 * CheckpointBar — saved moments in a recording.
 *
 * Bookmarks are persisted per-recording in localStorage so you can mark
 * "the moment the agent broke" and come back to it. Rendered as a row of
 * chips above the timeline; click to jump, right-click to remove.
 */
import { memo } from "react";
import type { Checkpoint } from "../hooks/useCheckpoints.js";
import styles from "./CheckpointBar.module.css";

interface Props {
  checkpoints: readonly Checkpoint[];
  cursor: number;
  onJump: (cursor: number) => void;
  onRemove: (index: number) => void;
  onAdd: (label?: string) => void;
}

function CheckpointBarImpl({ checkpoints, cursor, onJump, onRemove, onAdd }: Props): JSX.Element {
  return (
    <div className={styles.bar}>
      <button className={styles.add} onClick={() => onAdd()} title="bookmark this moment (B)">
        + bookmark
      </button>
      {checkpoints.length === 0 ? (
        <span className={styles.hint}>no bookmarks yet — press B to mark a moment</span>
      ) : (
        <ul className={styles.list}>
          {checkpoints.map((cp, index) => (
            <li
              key={`${cp.cursor}-${cp.createdAt}`}
              className={styles.chip}
              data-active={cp.cursor === cursor || undefined}
              onClick={() => onJump(cp.cursor)}
              onContextMenu={(e) => {
                e.preventDefault();
                onRemove(index);
              }}
              title={`${cp.label} @ ${cp.cursor} — click to jump, right-click to remove`}
            >
              <span className={styles.label}>{cp.label}</span>
              <span className={styles.pos}>@{cp.cursor}</span>
            </li>
          ))}
        </ul>
      )}
      <span className={styles.cursor}>cursor: {cursor}</span>
    </div>
  );
}

export const CheckpointBar = memo(CheckpointBarImpl);
