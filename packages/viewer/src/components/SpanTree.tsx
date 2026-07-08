/**
 * SpanTree — renders the recording's spans as a collapsible tree.
 *
 * Spans nest (a tool call spawns children), and the tree shows that
 * hierarchy: depth, duration, event count per span. Click a span to
 * filter the timeline to just its events.
 */
import { memo, useMemo } from "react";
import type { ReplaySpan } from "@agent-replay/core";
import styles from "./SpanTree.module.css";

interface Props {
  spans: ReplaySpan[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}

interface TreeNode {
  span: ReplaySpan;
  children: TreeNode[];
  depth: number;
}

function buildTree(spans: ReplaySpan[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const s of spans) byId.set(s.id, { span: s, children: [], depth: 0 });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.span.parentId ? byId.get(node.span.parentId) : null;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function SpanTreeImpl({ spans, activeId, onSelect }: Props): JSX.Element {
  const roots = useMemo(() => buildTree(spans), [spans]);

  if (spans.length === 0) {
    return <div className={styles.empty}>no spans</div>;
  }

  return (
    <div className={styles.tree} role="tree" aria-label="spans">
      {roots.map((node) => (
        <SpanRow key={node.span.id} node={node} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function SpanRow({
  node,
  activeId,
  onSelect,
}: {
  node: TreeNode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
}): JSX.Element {
  const { span, children, depth } = node;
  const isActive = activeId === span.id;
  const ended = span.endedAt !== null;
  const dur = ended ? span.endedAt! - span.startedAt : 0;

  return (
    <>
      <button
        className={`${styles.row} ${isActive ? styles.active : ""}`}
        style={{ ["--depth" as string]: depth }}
        onClick={() => onSelect(isActive ? null : span.id)}
        role="treeitem"
        aria-selected={isActive}
      >
        <span className={styles.name}>{span.name}</span>
        <span className={styles.meta}>
          {span.eventIds.length} evt{span.eventIds.length === 1 ? "" : "s"}
          {ended && <span className={styles.dur}> · {dur}ms</span>}
        </span>
      </button>
      {children.map((child) => (
        <SpanRow key={child.span.id} node={child} activeId={activeId} onSelect={onSelect} />
      ))}
    </>
  );
}

export const SpanTree = memo(SpanTreeImpl);
