import { useRef } from "react";
import type { ActivityEntry } from "@/lib/kanban";
import { useClickOutside } from "@/lib/useClickOutside";
import { CloseIcon } from "@/components/icons";

type ActivityPanelProps = {
  entries: ActivityEntry[];
  onClose: () => void;
};

export const ActivityPanel = ({ entries, onClose }: ActivityPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, onClose);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Board activity"
      className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 rounded-2xl border border-[var(--stroke)] bg-white p-3 shadow-[0_20px_40px_rgba(36,31,24,0.16)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-[var(--navy-dark)]">
          Activity
        </h2>
        <button
          type="button"
          onClick={onClose}
          title="Close activity"
          aria-label="Close activity"
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="px-1 py-4 text-center text-sm text-[var(--gray-text)]">
          No activity yet.
        </p>
      ) : (
        <ul className="board-scroll max-h-96 space-y-2 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-[var(--surface)] px-2.5 py-2">
              <p className="text-[12px] leading-5 text-[var(--navy-dark)]">{entry.message}</p>
              <span className="text-[10px] text-[var(--gray-text)]">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
