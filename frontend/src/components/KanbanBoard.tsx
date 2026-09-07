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
import { BoardSwitcher } from "@/components/BoardSwitcher";
import { AddColumnForm } from "@/components/AddColumnForm";
import { FilterBar } from "@/components/FilterBar";
import {
  BoardIcon,
  HistoryIcon,
  LogoutIcon,
  PanelIcon,
  RefreshIcon,
  SparkIcon,
} from "@/components/icons";
import { ActivityPanel } from "@/components/ActivityPanel";
import {
  createId,
  initialData,
  moveCardInBoard,
  cardMatchesFilters,
  appendActivity,
  EMPTY_FILTERS,
  type BoardData,
  type Card,
  type CardFilters,
  type Priority,
} from "@/lib/kanban";
import {
  listBoards,
  createBoard,
  fetchBoard,
  updateBoard,
  renameBoard,
  deleteBoard,
  type BoardSummary,
} from "@/lib/api";

// Hex (not CSS vars) so accents can be composed with alpha suffixes for glows.
const COLUMN_ACCENTS = ["#2f5d44", "#b5532c", "#d9a441", "#3c7a89", "#d9663a"];

const accentFor = (index: number) => COLUMN_ACCENTS[index % COLUMN_ACCENTS.length];

// Base has no background/text color so active variants can set them without
// relying on Tailwind class ordering to win the cascade.
const toolbarButtonBase =
  "grid h-10 w-10 place-items-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/40";

const toolbarButtonIdle =
  "border-[var(--stroke)] bg-white/70 text-[var(--gray-text)] hover:border-[var(--stroke-strong)] hover:bg-white hover:text-[var(--navy-dark)]";

const toolbarButtonActive =
  "border-transparent bg-[var(--secondary-purple)] text-white shadow-[0_8px_18px_rgba(181,83,44,0.28)] hover:brightness-110";

const lastBoardStorageKey = (username: string | null) => `pm-last-board-id:${username ?? "guest"}`;

export const KanbanBoard = ({
  username,
  onLogout,
}: {
  username: string | null;
  onLogout: () => void;
}) => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<number | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const actor = username ?? "Unknown";
  const logActivity = (b: BoardData, message: string): BoardData => ({
    ...b,
    activity: appendActivity(b.activity, message, actor),
  });

  useEffect(() => {
    const init = async () => {
      try {
        const boardList = await listBoards();
        setBoards(boardList);

        const storedId = Number(
          typeof window !== "undefined" ? window.localStorage.getItem(lastBoardStorageKey(username)) : null
        );
        const initialId =
          boardList.find((b) => b.id === storedId)?.id ?? boardList[0]?.id ?? null;

        if (initialId === null) {
          throw new Error("No boards available");
        }

        const data = await fetchBoard(initialId);
        setCurrentBoardId(initialId);
        setBoard(data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(lastBoardStorageKey(username), String(initialId));
        }
      } catch (err) {
        setLoadError("Failed to load board");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const syncBoard = async (newBoard: BoardData, boardId: number | null = currentBoardId) => {
    if (boardId === null) return;
    try {
      await updateBoard(boardId, newBoard);
      setSyncError(null);
    } catch (err) {
      setSyncError('Failed to save changes');
      console.error(err);
    }
  };

  const refreshBoard = async () => {
    if (currentBoardId === null) return;
    setIsRefreshing(true);
    try {
      const data = await fetchBoard(currentBoardId);
      setBoard(data);
      setSyncError(null);
    } catch (err) {
      setSyncError("Failed to refresh board");
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const switchToBoard = async (boardId: number) => {
    setCurrentBoardId(boardId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(lastBoardStorageKey(username), String(boardId));
    }
    setLoading(true);
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
      setLoadError(null);
    } catch (err) {
      setLoadError("Failed to load board");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (name: string) => {
    try {
      const created = await createBoard(name);
      setBoards((prev) => [...prev, { id: created.id, name: created.name }]);
      setCurrentBoardId(created.id);
      setBoard(created.board);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(lastBoardStorageKey(username), String(created.id));
      }
    } catch (err) {
      setSyncError("Failed to create board");
      console.error(err);
    }
  };

  const handleRenameBoard = async (boardId: number, name: string) => {
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, name } : b)));
    try {
      await renameBoard(boardId, name);
    } catch (err) {
      setSyncError("Failed to rename board");
      console.error(err);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    try {
      await deleteBoard(boardId);
      const remaining = boards.filter((b) => b.id !== boardId);
      setBoards(remaining);
      if (boardId === currentBoardId && remaining.length > 0) {
        await switchToBoard(remaining[0].id);
      }
    } catch (err) {
      setSyncError("Failed to delete board");
      console.error(err);
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
      const movedCard = board.cards[active.id as string];
      const sourceColumnId = board.columns.find((column) =>
        column.cardIds.includes(active.id as string)
      )?.id;
      const targetColumn = result.columns.find((column) =>
        column.cardIds.includes(active.id as string)
      );
      const logged =
        movedCard && targetColumn && targetColumn.id !== sourceColumnId
          ? logActivity(result, `${actor} moved "${movedCard.title}" to ${targetColumn.title}`)
          : result;
      setBoard(logged);
      syncBoard(logged);
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

  const handleAddColumn = (title: string) => {
    const newColumn = { id: createId("col"), title, cardIds: [] };
    const newBoard = logActivity(
      { ...board, columns: [...board.columns, newColumn] },
      `${actor} added column "${title}"`
    );
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = board.columns.find((c) => c.id === columnId);
    if (!column || column.cardIds.length > 0 || board.columns.length <= 1) {
      return;
    }
    const newBoard = logActivity(
      { ...board, columns: board.columns.filter((c) => c.id !== columnId) },
      `${actor} deleted column "${column.title}"`
    );
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const handleAddCard = (
    columnId: string,
    title: string,
    details: string,
    dueDate?: string,
    priority?: Priority,
    labels?: string[]
  ) => {
    const id = createId("card");
    const newBoard = logActivity(
      {
        ...board,
        cards: {
          ...board.cards,
          [id]: { id, title, details: details || "No details yet.", dueDate, priority, labels },
        },
        columns: board.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: [...column.cardIds, id] }
            : column
        ),
      },
      `${actor} added "${title}"`
    );
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    const deletedTitle = board.cards[cardId]?.title ?? "a card";
    const newBoard = logActivity(
      {
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
      },
      `${actor} deleted "${deletedTitle}"`
    );
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const handleEditCard = (
    cardId: string,
    title: string,
    details: string,
    dueDate?: string,
    priority?: Priority,
    labels?: string[]
  ) => {
    const newBoard = logActivity(
      {
        ...board,
        cards: {
          ...board.cards,
          [cardId]: { ...board.cards[cardId], title, details, dueDate, priority, labels },
        },
      },
      `${actor} edited "${title}"`
    );
    setBoard(newBoard);
    syncBoard(newBoard);
  };

  const handleAddComment = (cardId: string, text: string) => {
    const existingCard = board.cards[cardId];
    const comment = {
      id: createId("comment"),
      author: actor,
      text,
      createdAt: new Date().toISOString(),
    };
    const newBoard = logActivity(
      {
        ...board,
        cards: {
          ...board.cards,
          [cardId]: {
            ...existingCard,
            comments: [...(existingCard.comments ?? []), comment],
          },
        },
      },
      `${actor} commented on "${existingCard.title}"`
    );
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

  const visibleCardCount = useMemo(
    () => Object.values(board.cards).filter((card) => cardMatchesFilters(card, filters)).length,
    [board.cards, filters]
  );

  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    Object.values(board.cards).forEach((card) => card.labels?.forEach((label) => labels.add(label)));
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [board.cards]);

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
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(47,93,68,0.22)_0%,_rgba(47,93,68,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(181,83,44,0.16)_0%,_rgba(181,83,44,0.05)_55%,_transparent_75%)]" />

      <header className="relative z-20 shrink-0 border-b border-[var(--stroke)] bg-white/70 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary-blue),var(--secondary-purple))] text-white shadow-[0_8px_18px_rgba(47,93,68,0.35)]">
              <BoardIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold leading-tight text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--gray-text)] sm:block">
                {boards.length} {boards.length === 1 ? "board" : "boards"}
              </p>
            </div>
          </div>

          <BoardSwitcher
            boards={boards}
            currentBoardId={currentBoardId}
            onSelect={switchToBoard}
            onCreate={handleCreateBoard}
            onRename={handleRenameBoard}
            onDelete={handleDeleteBoard}
          />

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
            <div className="relative">
              <button
                onClick={() => setIsActivityOpen((prev) => !prev)}
                className={clsx(
                  toolbarButtonBase,
                  isActivityOpen ? toolbarButtonActive : toolbarButtonIdle
                )}
                title={isActivityOpen ? "Hide activity" : "Show activity"}
                aria-label={isActivityOpen ? "Hide activity" : "Show activity"}
                aria-pressed={isActivityOpen}
              >
                <HistoryIcon className="h-[18px] w-[18px]" />
              </button>
              {isActivityOpen && (
                <ActivityPanel
                  entries={board.activity ?? []}
                  onClose={() => setIsActivityOpen(false)}
                />
              )}
            </div>
            <span className="mx-1 h-6 w-px bg-[var(--stroke)]" />
            {username && (
              <span className="hidden text-xs font-semibold text-[var(--gray-text)] sm:inline">
                {username}
              </span>
            )}
            <button
              onClick={onLogout}
              className={clsx(toolbarButtonBase, toolbarButtonIdle)}
              title={username ? `Sign out (${username})` : "Sign out"}
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

      <FilterBar
        filters={filters}
        onChange={setFilters}
        visibleCount={visibleCardCount}
        totalCount={totalCards}
        availableLabels={availableLabels}
      />

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
                  cards={
                    column.cardIds
                      .map((cardId) => board.cards[cardId])
                      .filter(Boolean)
                      .filter((card) => cardMatchesFilters(card, filters)) as Card[]
                  }
                  totalCardCount={column.cardIds.length}
                  canDelete={column.cardIds.length === 0 && board.columns.length > 1}
                  onRename={handleRenameColumn}
                  onRenameBlur={handleRenameColumnBlur}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onEditCard={handleEditCard}
                  onDeleteColumn={handleDeleteColumn}
                  onAddComment={handleAddComment}
                />
              ))}
              <AddColumnForm onAdd={handleAddColumn} />
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

        {isChatOpen && currentBoardId !== null ? (
          // Always a real flex sibling (never absolutely positioned over the
          // board) so main's own width shrinks to make room for it at every
          // size, and every column stays reachable through main's own
          // horizontal scrollbar instead of being hidden behind an overlay.
          <div className="w-[340px] shrink-0 border-l border-[var(--stroke)] bg-white/60 backdrop-blur 2xl:w-[400px]">
            <ChatSidebar
              key={currentBoardId}
              boardId={currentBoardId}
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
