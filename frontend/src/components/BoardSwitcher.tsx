import { useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import type { BoardSummary } from "@/lib/api";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";

type BoardSwitcherProps = {
  boards: BoardSummary[];
  currentBoardId: number | null;
  onSelect: (boardId: number) => void;
  onCreate: (name: string) => void;
  onRename: (boardId: number, name: string) => void;
  onDelete: (boardId: number) => void;
};

export const BoardSwitcher = ({
  boards,
  currentBoardId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: BoardSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentBoard = boards.find((board) => board.id === currentBoardId);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const startRenaming = (board: BoardSummary) => {
    setRenamingId(board.id);
    setRenameValue(board.name);
  };

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (renamingId !== null && trimmed) {
      onRename(renamingId, trimmed);
    }
    setRenamingId(null);
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewBoardName("");
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-w-0 max-w-[220px] items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-white/70 px-3 py-2 text-left transition hover:border-[var(--stroke-strong)] hover:bg-white"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--navy-dark)]">
          {currentBoard?.name ?? "Select board"}
        </span>
        <ChevronDownIcon
          className={clsx(
            "h-4 w-4 shrink-0 text-[var(--gray-text)] transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-20 w-72 rounded-2xl border border-[var(--stroke)] bg-white p-2 shadow-[0_20px_40px_rgba(3,33,71,0.16)]"
        >
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {boards.map((board) => (
              <li key={board.id}>
                {renamingId === board.id ? (
                  <form onSubmit={submitRename} className="flex items-center gap-1.5 px-1 py-1">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      autoFocus
                      className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)] focus:bg-white"
                      aria-label="Board name"
                    />
                    <button
                      type="submit"
                      title="Save"
                      aria-label="Save board name"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      title="Cancel"
                      aria-label="Cancel rename"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <div
                    className={clsx(
                      "group flex items-center gap-1 rounded-lg px-1",
                      board.id === currentBoardId && "bg-[var(--surface)]"
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={board.id === currentBoardId}
                      onClick={() => {
                        onSelect(board.id);
                        setIsOpen(false);
                      }}
                      className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm font-medium text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
                    >
                      {board.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => startRenaming(board)}
                      title={`Rename ${board.name}`}
                      aria-label={`Rename ${board.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] opacity-0 transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)] group-hover:opacity-100"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(board.id)}
                      disabled={boards.length <= 1}
                      title={boards.length <= 1 ? "Can't delete your only board" : `Delete ${board.name}`}
                      aria-label={`Delete ${board.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-1 border-t border-[var(--stroke)] pt-1.5">
            {isCreating ? (
              <form onSubmit={submitCreate} className="flex items-center gap-1.5 px-1 py-1">
                <input
                  value={newBoardName}
                  onChange={(event) => setNewBoardName(event.target.value)}
                  placeholder="Board name"
                  autoFocus
                  className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)] focus:bg-white"
                  aria-label="New board name"
                />
                <button
                  type="submit"
                  title="Create board"
                  aria-label="Create board"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  title="Cancel"
                  aria-label="Cancel new board"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--primary-blue)] transition hover:bg-[var(--surface)]"
              >
                <PlusIcon className="h-4 w-4" />
                New board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
