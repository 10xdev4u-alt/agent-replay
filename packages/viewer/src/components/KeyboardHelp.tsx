/**
 * KeyboardHelp — a discoverable overlay listing all shortcuts.
 *
 * Toggled with `?`. Shows the full keymap so users don't have to guess.
 * Real UX, not decoration: a power-user tool is only as good as its
 * shortcuts are discoverable.
 */
import { memo } from "react";
import styles from "./KeyboardHelp.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<[string, string]> = [
  ["Space", "Play / Pause"],
  ["← / →", "Step back / forward one event"],
  ["Home / End", "Jump to start / end"],
  ["+ / −", "Speed up / slow down playback"],
  ["/", "Focus the search box"],
  ["?", "Toggle this help overlay"],
  ["Esc", "Close overlays"],
];

function KeyboardHelpImpl({ open, onClose }: Props): JSX.Element | null {
  if (!open) return null;
  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2>Keyboard shortcuts</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </header>
        <dl className={styles.list}>
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className={styles.row}>
              <dt><kbd>{key}</kbd></dt>
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export const KeyboardHelp = memo(KeyboardHelpImpl);
