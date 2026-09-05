import { useState, type FormEvent } from "react";
import type { Comment } from "@/lib/kanban";
import { SendIcon } from "@/components/icons";

type CardCommentsProps = {
  comments: Comment[];
  onAdd: (text: string) => void;
};

export const CardComments = ({ comments, onAdd }: CardCommentsProps) => {
  const [text, setText] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
  };

  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      className="mt-2.5 space-y-2 border-t border-[var(--stroke)] pt-2.5"
    >
      {comments.length > 0 && (
        <ul className="board-scroll max-h-40 space-y-2 overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-[var(--surface)] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--navy-dark)]">
                  {comment.author}
                </span>
                <span className="text-[10px] text-[var(--gray-text)]">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] leading-5 text-[var(--gray-text)]">
                {comment.text}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a comment..."
          aria-label="Write a comment"
          className="min-w-0 flex-1 rounded-xl border border-[var(--stroke)] bg-white px-3 py-1.5 text-[12px] text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <button
          type="submit"
          title="Post comment"
          aria-label="Post comment"
          disabled={!text.trim()}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--primary-blue)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendIcon className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
