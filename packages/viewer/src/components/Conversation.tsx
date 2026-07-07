/**
 * Conversation — reconstructs the chat from message + delta events.
 *
 * As the cursor moves, messages appear and assistant text streams in delta
 * by delta. This is the "watch the agent think" view.
 */
import { memo } from "react";
import type { ReplayMessage } from "@agent-replay/core";
import { formatRole } from "../utils/format.js";

interface Props {
  messages: ReplayMessage[];
  cursor: number;
}

function ConversationImpl({ messages, cursor }: Props): JSX.Element {
  if (messages.length === 0) {
    return (
      <div className="conversation empty">
        <p>No messages yet at this point in the replay.</p>
      </div>
    );
  }

  return (
    <div className="conversation" role="log" aria-live="polite">
      {messages.map((m, i) => (
        <MessageBubble key={m.id} message={m} isLast={i === messages.length - 1} cursor={cursor} />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
}: {
  message: ReplayMessage;
  isLast: boolean;
  cursor: number;
}): JSX.Element {
  const text = stringifyContent(message.content);
  const streaming = isLast && message.role === "assistant" && !text.endsWith("\n");
  return (
    <div className={`bubble bubble--${message.role}`} data-streaming={streaming ? "true" : "false"}>
      <div className="bubble__role">{formatRole(message.role)}</div>
      <div className="bubble__content">
        <pre>{text}{streaming && <span className="caret" aria-hidden="true">▋</span>}</pre>
      </div>
    </div>
  );
}

function stringifyContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (content === null || content === undefined) return "";
  if (typeof content === "object") {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }
  return String(content);
}

export const Conversation = memo(ConversationImpl);
