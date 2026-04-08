"use client";

import { FormEvent, useMemo, useState } from "react";
import { sendChatMessage } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const ChatSidebar = ({
  onBoardUpdated,
}: {
  onBoardUpdated: () => Promise<void> | void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = input.trim();
    if (!question || sending) {
      return;
    }

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const result = await sendChatMessage(question);
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

  return (
    <aside className="rounded-[28px] border border-[var(--stroke)] bg-white/90 p-5 shadow-[var(--shadow)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
          AI Assistant
        </h2>
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
          Kanban Chat
        </span>
      </div>

      <div className="mb-4 h-[430px] overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
        {!hasMessages ? (
          <p className="text-sm leading-6 text-[var(--gray-text)]">
            Ask me to create, edit, move, or summarize cards.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-[var(--primary-blue)] text-white"
                    : "border border-[var(--stroke)] bg-white text-[var(--navy-dark)]"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask AI to update your board..."
          className="h-24 w-full resize-none rounded-2xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--secondary-purple)]"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-full rounded-2xl bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </aside>
  );
};
