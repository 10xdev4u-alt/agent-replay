/**
 * StatsPanel — at-a-glance recording analytics.
 *
 * Renders core's RecordingSummary as compact stat cards: duration, events,
 * tokens, cost, errors, plus provider and tool breakdowns. Lives in the
 * sidebar of the viewer.
 */
import { memo } from "react";
import type { RecordingSummary } from "@agent-replay/core";
import styles from "./StatsPanel.module.css";

interface Props {
  summary: RecordingSummary;
}

function StatsPanelImpl({ summary }: Props): JSX.Element {
  const duration = formatDuration(summary.durationMs);
  const hasTokens = summary.totalTokens > 0;
  const hasCost = summary.totalCost > 0;
  const hasProviders = summary.providers.length > 0;
  const hasTools = summary.tools.length > 0;

  return (
    <section className={styles.panel} aria-label="recording statistics">
      <div className={styles.grid}>
        <Stat label="duration" value={duration} />
        <Stat label="events" value={String(summary.eventCount)} />
        <Stat label="spans" value={String(summary.spanCount)} />
        <Stat label="depth" value={String(summary.maxDepth)} />
        {hasTokens && <Stat label="tokens" value={summary.totalTokens.toLocaleString()} />}
        {hasCost && <Stat label="cost" value={`$${summary.totalCost.toFixed(4)}`} />}
        <Stat
          label="errors"
          value={String(summary.errorCount)}
          danger={summary.errorCount > 0}
        />
      </div>

      {hasProviders && (
        <div className={styles.block}>
          <h4 className={styles.heading}>providers</h4>
          {summary.providers.map((p) => (
            <div key={p.name} className={styles.row}>
              <span className={styles.name} title={p.name}>{p.name}</span>
              <span className={styles.meta}>
                {p.prompts}→{p.responses}
                {hasTokens && p.tokens > 0 && ` · ${p.tokens.toLocaleString()} tok`}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasTools && (
        <div className={styles.block}>
          <h4 className={styles.heading}>tools</h4>
          {summary.tools.map((t) => (
            <div key={t.name} className={styles.row}>
              <span className={styles.name} title={t.name}>{t.name}</span>
              <span className={styles.meta}>
                ×{t.calls}
                {t.errors > 0 && <span className={styles.danger}> · {t.errors} err</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={styles.stat} data-danger={danger ? "" : undefined}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m${s}s`;
}

export const StatsPanel = memo(StatsPanelImpl);
