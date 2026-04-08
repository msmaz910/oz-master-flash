import { moveCard, moveCardInBoard, type BoardData, type Column } from "@/lib/kanban";

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
