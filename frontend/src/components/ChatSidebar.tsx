"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { sendChatMessage } from "@/lib/api";
import { CloseIcon, SendIcon, SparkIcon } from "@/components/icons";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Summarize the board",
  "Add a card for onboarding docs",
  "Move blocked work to Review",
];

export const ChatSidebar = ({
  boardId,
  onBoardUpdated,
  onClose,
}: {
  boardId: number;
  onBoardUpdated: () => Promise<void> | void;
  onClose?: () => void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, sending]);

  const submitQuestion = async (question: string) => {
    if (!question || sending) {
      return;
    }

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const result = await sendChatMessage(boardId, question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response || "No response." },
      ]);

      if (result.boardUpdated) {
        await onBoardUpdated();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(input.trim());
  };

  return (
    <aside className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--stroke)] px-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--secondary-purple)]/10 text-[var(--secondary-purple)]">
          <SparkIcon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-semibold leading-tight text-[var(--navy-dark)]">
            AI Assistant
          </h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Kanban Chat
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close AI chat"
            aria-label="Close AI chat"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="board-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-[var(--gray-text)]">
              Ask me to create, edit, move, or summarize cards.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submitQuestion(suggestion)}
                  className="rounded-full border border-[var(--stroke)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--navy-dark)] transition hover:border-[var(--secondary-purple)] hover:text-[var(--secondary-purple)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={clsx(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={clsx(
                  "max-w-[88%] whitespace-pre-wrap px-3.5 py-2.5 text-[13px] leading-6 shadow-[0_4px_12px_rgba(36,31,24,0.06)]",
                  message.role === "user"
                    ? "rounded-2xl rounded-br-md bg-[var(--primary-blue)] text-white"
                    : "rounded-2xl rounded-bl-md border border-[var(--stroke)] bg-white text-[var(--navy-dark)]"
                )}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[var(--stroke)] bg-white px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)]"
                  style={{ animationDelay: `${dot * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        className="shrink-0 border-t border-[var(--stroke)] p-3"
        onSubmit={handleSubmit}
      >
        <div className="rounded-2xl border border-[var(--stroke)] bg-white p-2 transition focus-within:border-[var(--secondary-purple)]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitQuestion(input.trim());
              }
            }}
            placeholder="Ask AI to update your board..."
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1 text-[13px] leading-6 text-[var(--navy-dark)] outline-none placeholder:text-[var(--gray-text)]"
            disabled={sending}
          />
          <div className="flex items-center justify-between gap-2 pl-2">
            <span className="text-[11px] text-[var(--gray-text)]">
              Enter to send
            </span>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--secondary-purple)] px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon className="h-4 w-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
};
