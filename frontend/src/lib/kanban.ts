export type Priority = "low" | "medium" | "high";

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export type Comment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

export type Card = {
  id: string;
  title: string;
  details: string;
  dueDate?: string;
  priority?: Priority;
  comments?: Comment[];
};

export const isOverdue = (dueDate: string | undefined, today: Date = new Date()): boolean => {
  if (!dueDate) return false;
  const todayStr = today.toISOString().slice(0, 10);
  return dueDate < todayStr;
};

export type CardFilters = {
  query: string;
  priority: Priority | "all";
  overdueOnly: boolean;
};

export const EMPTY_FILTERS: CardFilters = {
  query: "",
  priority: "all",
  overdueOnly: false,
};

export const hasActiveFilters = (filters: CardFilters): boolean =>
  filters.query.trim() !== "" || filters.priority !== "all" || filters.overdueOnly;

export const cardMatchesFilters = (card: Card, filters: CardFilters): boolean => {
  const query = filters.query.trim().toLowerCase();
  if (query) {
    const haystack = `${card.title} ${card.details}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.priority !== "all" && card.priority !== filters.priority) return false;
  if (filters.overdueOnly && !isOverdue(card.dueDate)) return false;
  return true;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type ActivityEntry = {
  id: string;
  message: string;
  author: string;
  createdAt: string;
};

export const MAX_ACTIVITY_ENTRIES = 100;

export type BoardData = {
  columns: Column[];
  cards: Record<string, Card>;
  activity?: ActivityEntry[];
};

export const appendActivity = (
  activity: ActivityEntry[] | undefined,
  message: string,
  author: string
): ActivityEntry[] => {
  const entry: ActivityEntry = {
    id: createId("activity"),
    message,
    author,
    createdAt: new Date().toISOString(),
  };
  return [entry, ...(activity ?? [])].slice(0, MAX_ACTIVITY_ENTRIES);
};

export const initialData: BoardData = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    {
      id: "col-progress",
      title: "In Progress",
      cardIds: ["card-4", "card-5"],
    },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Align roadmap themes",
      details: "Draft quarterly themes with impact statements and metrics.",
    },
    "card-2": {
      id: "card-2",
      title: "Gather customer signals",
      details: "Review support tags, sales notes, and churn feedback.",
    },
    "card-3": {
      id: "card-3",
      title: "Prototype analytics view",
      details: "Sketch initial dashboard layout and key drill-downs.",
    },
    "card-4": {
      id: "card-4",
      title: "Refine status language",
      details: "Standardize column labels and tone across the board.",
    },
    "card-5": {
      id: "card-5",
      title: "Design card layout",
      details: "Add hierarchy and spacing for scanning dense lists.",
    },
    "card-6": {
      id: "card-6",
      title: "QA micro-interactions",
      details: "Verify hover, focus, and loading states.",
    },
    "card-7": {
      id: "card-7",
      title: "Ship marketing page",
      details: "Final copy approved and asset pack delivered.",
    },
    "card-8": {
      id: "card-8",
      title: "Close onboarding sprint",
      details: "Document release notes and share internally.",
    },
  },
};

const isColumnId = (columns: Column[], id: string) =>
  columns.some((column) => column.id === id);

const findColumnId = (columns: Column[], id: string) => {
  if (isColumnId(columns, id)) {
    return id;
  }
  return columns.find((column) => column.cardIds.includes(id))?.id;
};

export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const activeColumnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!activeColumnId || !overColumnId) {
    return columns;
  }

  const activeColumn = columns.find((column) => column.id === activeColumnId);
  const overColumn = columns.find((column) => column.id === overColumnId);

  if (!activeColumn || !overColumn) {
    return columns;
  }

  const isOverColumn = isColumnId(columns, overId);

  // Normalize first: remove the active card from all columns, then insert once.
  // This prevents edge cases where stale/AI-updated board data contains duplicates.
  const normalizedColumns = columns.map((column) => ({
    ...column,
    cardIds: column.cardIds.filter((cardId) => cardId !== activeId),
  }));

  const targetColumnId = isOverColumn ? overId : overColumnId;
  const targetColumn = normalizedColumns.find((column) => column.id === targetColumnId);

  if (!targetColumn) {
    return columns;
  }

  const insertIndex = isOverColumn
    ? targetColumn.cardIds.length
    : (() => {
        const index = targetColumn.cardIds.indexOf(overId);
        return index === -1 ? targetColumn.cardIds.length : index;
      })();

  return normalizedColumns.map((column) => {
    if (column.id !== targetColumnId) {
      return column;
    }

    const nextCardIds = [...column.cardIds];
    nextCardIds.splice(insertIndex, 0, activeId);
    return { ...column, cardIds: nextCardIds };
  });
};

export function moveCardInBoard(board: BoardData, cardId: string, targetId: string): BoardData | null {
  if (!board.cards[cardId]) {
    return null;
  }

  const targetIsCard = Boolean(board.cards[targetId]);
  const targetIsColumn = board.columns.some((col) => col.id === targetId);

  if (!targetIsCard && !targetIsColumn) {
    return null;
  }

  return {
    ...board,
    columns: moveCard(board.columns, cardId, targetId),
  };
}

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};
