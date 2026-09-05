"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import {
  BoardIcon,
  LogoutIcon,
  PanelIcon,
  RefreshIcon,
  SparkIcon,
} from "@/components/icons";
import { createId, initialData, moveCardInBoard, type BoardData, type Card } from "@/lib/kanban";
import { fetchBoard, updateBoard } from "@/lib/api";

// Hex (not CSS vars) so accents can be composed with alpha suffixes for glows.
const COLUMN_ACCENTS = ["#209dd7", "#753991", "#ecad0a", "#0ea5a4", "#ef6f5c"];

const accentFor = (index: number) => COLUMN_ACCENTS[index % COLUMN_ACCENTS.length];

// Base has no background/text color so active variants can set them without
// relying on Tailwind class ordering to win the cascade.
const toolbarButtonBase =
  "grid h-10 w-10 place-items-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/40";

const toolbarButtonIdle =
  "border-[var(--stroke)] bg-white/70 text-[var(--gray-text)] hover:border-[var(--stroke-strong)] hover:bg-white hover:text-[var(--navy-dark)]";

const toolbarButtonActive =
  "border-transparent bg-[var(--secondary-purple)] text-white shadow-[0_8px_18px_rgba(117,57,145,0.28)] hover:brightness-110";

export const KanbanBoard = ({ onLogout }: { onLogout: () => void }) => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const data = await fetchBoard();
        setBoard(data);
      } catch (err) {
        setLoadError('Failed to load board');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadBoard();
  }, []);

  const syncBoard = async (newBoard: BoardData) => {
    try {
      await updateBoard(newBoard);
      setSyncError(null);
    } catch (err) {
      setSyncError('Failed to save changes');
      console.error(err);
    }
  };

  const refreshBoard = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchBoard();
      setBoard(data);
      setSyncError(null);
    } catch (err) {
      setSyncError("Failed to refresh board");
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const result = moveCardInBoard(board, active.id as string, over.id as string);
    if (result) {
      setBoard(result);
      syncBoard(result);
    }
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    const newBoard = {
      ...board,
      columns: board.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    };
    setBoard(newBoard);
  };

  const handleRenameColumnBlur = () => {
    syncBoard(board);
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    const newBoard = {
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    };
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    const newBoard = {
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            }
          : column
      ),
    };
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const activeCardAccent = useMemo(() => {
    if (!activeCardId) return undefined;
    const index = board.columns.findIndex((column) =>
      column.cardIds.includes(activeCardId)
    );
    return index >= 0 ? accentFor(index) : undefined;
  }, [activeCardId, board.columns]);

  const totalCards = useMemo(
    () => board.columns.reduce((sum, column) => sum + column.cardIds.length, 0),
    [board.columns]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary-blue)] border-t-transparent mx-auto"></div>
          <p className="text-[var(--gray-text)]">Loading your board...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-3xl border border-[var(--stroke)] bg-white px-10 py-8 text-center shadow-[var(--shadow)]">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <RefreshIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.22)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.16)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <header className="relative z-10 shrink-0 border-b border-[var(--stroke)] bg-white/70 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary-blue),var(--secondary-purple))] text-white shadow-[0_8px_18px_rgba(32,157,215,0.35)]">
              <BoardIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold leading-tight text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--gray-text)] sm:block">
                Single board workspace
              </p>
            </div>
          </div>

          <div className="ml-2 hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-[var(--stroke)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--navy-dark)]">
              {totalCards} <span className="text-[var(--gray-text)]">cards</span>
            </span>
            <span className="rounded-full border border-[var(--stroke)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--navy-dark)]">
              {board.columns.length} <span className="text-[var(--gray-text)]">columns</span>
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {syncError && (
              <span className="hidden items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {syncError}
              </span>
            )}
            <button
              onClick={refreshBoard}
              className={clsx(toolbarButtonBase, toolbarButtonIdle)}
              title="Refresh board"
              aria-label="Refresh board"
            >
              <RefreshIcon className={clsx("h-[18px] w-[18px]", isRefreshing && "animate-spin")} />
            </button>
            <button
              onClick={() => setIsChatOpen((prev) => !prev)}
              className={clsx(
                toolbarButtonBase,
                isChatOpen ? toolbarButtonActive : toolbarButtonIdle
              )}
              title={isChatOpen ? "Hide AI Chat" : "Show AI Chat"}
              aria-label={isChatOpen ? "Hide AI Chat" : "Show AI Chat"}
              aria-pressed={isChatOpen}
            >
              <SparkIcon className="h-[18px] w-[18px]" />
            </button>
            <span className="mx-1 h-6 w-px bg-[var(--stroke)]" />
            <button
              onClick={onLogout}
              className={clsx(toolbarButtonBase, toolbarButtonIdle)}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogoutIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {syncError && (
        <div className="relative z-10 border-b border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-600 sm:hidden">
          {syncError}
        </div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <main
            className="board-scroll min-w-0 flex-1 overflow-x-auto px-5 py-5"
            style={{ containerType: "inline-size" }}
          >
            <section className="flex h-full min-h-[420px] items-stretch gap-4">
              {board.columns.map((column, index) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  accent={accentFor(index)}
                  cards={column.cardIds.map((cardId) => board.cards[cardId]).filter(Boolean) as Card[]}
                  onRename={handleRenameColumn}
                  onRenameBlur={handleRenameColumnBlur}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>
          </main>
          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} accent={activeCardAccent} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {isChatOpen ? (
          // Always a real flex sibling (never absolutely positioned over the
          // board) so main's own width shrinks to make room for it at every
          // size, and every column stays reachable through main's own
          // horizontal scrollbar instead of being hidden behind an overlay.
          <div className="w-[340px] shrink-0 border-l border-[var(--stroke)] bg-white/60 backdrop-blur 2xl:w-[400px]">
            <ChatSidebar
              onBoardUpdated={refreshBoard}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="group flex w-12 shrink-0 flex-col items-center justify-center gap-3 border-l border-[var(--stroke)] bg-white/50 text-[var(--gray-text)] transition hover:bg-white hover:text-[var(--secondary-purple)]"
            title="Show AI Chat"
            aria-label="Show AI Chat"
          >
            <PanelIcon className="h-[18px] w-[18px]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] [writing-mode:vertical-rl]">
              AI Chat
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
