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
});
