import {
  moveCard,
  moveCardInBoard,
  cardMatchesFilters,
  hasActiveFilters,
  EMPTY_FILTERS,
  isOverdue,
  type BoardData,
  type Column,
  type Card,
} from "@/lib/kanban";

describe("cardMatchesFilters", () => {
  const card: Card = {
    id: "card-1",
    title: "Ship the release",
    details: "Cut the tag and notify stakeholders",
    priority: "high",
    dueDate: "2000-01-01",
  };

  it("matches everything with empty filters", () => {
    expect(cardMatchesFilters(card, EMPTY_FILTERS)).toBe(true);
  });

  it("matches a query against title or details, case-insensitively", () => {
    expect(cardMatchesFilters(card, { ...EMPTY_FILTERS, query: "SHIP" })).toBe(true);
    expect(cardMatchesFilters(card, { ...EMPTY_FILTERS, query: "stakeholders" })).toBe(true);
    expect(cardMatchesFilters(card, { ...EMPTY_FILTERS, query: "nonexistent" })).toBe(false);
  });

  it("filters by priority", () => {
    expect(cardMatchesFilters(card, { ...EMPTY_FILTERS, priority: "high" })).toBe(true);
    expect(cardMatchesFilters(card, { ...EMPTY_FILTERS, priority: "low" })).toBe(false);
  });

  it("filters by overdue status", () => {
    expect(cardMatchesFilters(card, { ...EMPTY_FILTERS, overdueOnly: true })).toBe(true);
    const notOverdue: Card = { ...card, dueDate: "2999-01-01" };
    expect(cardMatchesFilters(notOverdue, { ...EMPTY_FILTERS, overdueOnly: true })).toBe(false);
    const noDueDate: Card = { ...card, dueDate: undefined };
    expect(cardMatchesFilters(noDueDate, { ...EMPTY_FILTERS, overdueOnly: true })).toBe(false);
  });

  it("requires every active filter to match", () => {
    const filters = { query: "ship", priority: "high" as const, overdueOnly: true };
    expect(cardMatchesFilters(card, filters)).toBe(true);
    expect(cardMatchesFilters({ ...card, priority: "low" }, filters)).toBe(false);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the empty filter state", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("is true when any single filter is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "x" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, priority: "low" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, overdueOnly: true })).toBe(true);
  });
});

describe("isOverdue", () => {
  const today = new Date("2026-06-15T00:00:00.000Z");

  it("is false when there's no due date", () => {
    expect(isOverdue(undefined, today)).toBe(false);
  });

  it("is true for a date before today", () => {
    expect(isOverdue("2026-06-14", today)).toBe(true);
  });

  it("is false for today or a future date", () => {
    expect(isOverdue("2026-06-15", today)).toBe(false);
    expect(isOverdue("2026-06-16", today)).toBe(false);
  });
});

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });

  it("supports repeated back-and-forth moves across columns", () => {
    let current = baseColumns;

    // A -> B
    current = moveCard(current, "card-2", "col-b");
    expect(current[0].cardIds).toEqual(["card-1"]);
    expect(current[1].cardIds).toEqual(["card-3", "card-2"]);

    // B -> A
    current = moveCard(current, "card-2", "col-a");
    expect(current[0].cardIds).toEqual(["card-1", "card-2"]);
    expect(current[1].cardIds).toEqual(["card-3"]);
  });

  it("normalizes duplicate placements before moving", () => {
    const duplicated: Column[] = [
      { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
      { id: "col-b", title: "B", cardIds: ["card-2", "card-3"] },
    ];

    const result = moveCard(duplicated, "card-2", "col-a");

    expect(result[0].cardIds).toEqual(["card-1", "card-2"]);
    expect(result[1].cardIds).toEqual(["card-3"]);
  });
});

describe("moveCardInBoard", () => {
  const baseBoard: BoardData = {
    columns: [
      { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
      { id: "col-b", title: "B", cardIds: ["card-3"] },
    ],
    cards: {
      "card-1": { id: "card-1", title: "One", details: "One" },
      "card-2": { id: "card-2", title: "Two", details: "Two" },
      "card-3": { id: "card-3", title: "Three", details: "Three" },
    },
  };

  it("reorders cards within the same column without dropping the card", () => {
    const result = moveCardInBoard(baseBoard, "card-2", "card-1");
    expect(result).not.toBeNull();
    expect(result!.columns[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("returns null for unknown target", () => {
    const result = moveCardInBoard(baseBoard, "card-1", "missing-target");
    expect(result).toBeNull();
  });

  it("moves a card forward and backward across all columns", () => {
    let board: BoardData = {
      columns: [
        { id: "col-backlog", title: "Backlog", cardIds: ["card-1"] },
        { id: "col-discovery", title: "Discovery", cardIds: [] },
        { id: "col-progress", title: "In Progress", cardIds: [] },
        { id: "col-review", title: "Review", cardIds: [] },
        { id: "col-done", title: "Done", cardIds: [] },
      ],
      cards: {
        "card-1": { id: "card-1", title: "One", details: "One" },
      },
    };

    const sequence = [
      "col-discovery",
      "col-progress",
      "col-review",
      "col-done",
      "col-review",
      "col-progress",
      "col-discovery",
      "col-backlog",
    ];

    for (const target of sequence) {
      const moved = moveCardInBoard(board, "card-1", target);
      expect(moved).not.toBeNull();
      board = moved!;

      const containingColumns = board.columns.filter((col) =>
        col.cardIds.includes("card-1")
      );
      expect(containingColumns).toHaveLength(1);
      expect(containingColumns[0].id).toBe(target);
    }
  });
});
