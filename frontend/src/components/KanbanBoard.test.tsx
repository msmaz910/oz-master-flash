import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { vi } from "vitest";

// Mock the API functions
vi.mock("@/lib/api", () => ({
  listBoards: vi.fn(),
  createBoard: vi.fn(),
  fetchBoard: vi.fn(),
  updateBoard: vi.fn(),
  renameBoard: vi.fn(),
  deleteBoard: vi.fn(),
}));

import { listBoards, createBoard, fetchBoard, updateBoard, renameBoard, deleteBoard } from "@/lib/api";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const DEFAULT_BOARD = {
  columns: [
    { id: "col1", title: "To Do", cardIds: [] },
    { id: "col2", title: "In Progress", cardIds: [] },
    { id: "col3", title: "Review", cardIds: [] },
    { id: "col4", title: "Done", cardIds: [] },
    { id: "col5", title: "Archive", cardIds: [] },
  ],
  cards: {},
};

describe("KanbanBoard", () => {
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    (listBoards as any).mockResolvedValue([{ id: 1, name: "My Board" }]);
    (fetchBoard as any).mockResolvedValue(DEFAULT_BOARD);
    (updateBoard as any).mockResolvedValue(undefined);
    (createBoard as any).mockResolvedValue({ id: 2, name: "New Board", board: DEFAULT_BOARD });
    (renameBoard as any).mockResolvedValue(undefined);
    (deleteBoard as any).mockResolvedValue(undefined);
  });

  it("renders five columns after loading", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
  });

  it("adds a new column", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });

    await userEvent.click(screen.getByRole("button", { name: /add column/i }));
    await userEvent.type(screen.getByPlaceholderText(/column name/i), "Blocked");
    await userEvent.click(screen.getByRole("button", { name: /^add column$/i }));

    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(6);
    });
    expect(screen.getByDisplayValue("Blocked")).toBeInTheDocument();
    await waitFor(() => {
      expect(updateBoard).toHaveBeenCalled();
    });
  });

  it("deletes an empty column but not a column with cards", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });

    const firstColumn = getFirstColumn();
    // Empty column: delete control is present
    const deleteColumnButton = within(firstColumn).getByRole("button", {
      name: /delete to do column/i,
    });
    await userEvent.click(deleteColumnButton);

    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(4);
    });
    expect(screen.queryByDisplayValue("To Do")).not.toBeInTheDocument();
  });

  it("does not offer to delete a column that still has cards", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });

    const firstColumn = getFirstColumn();
    await userEvent.click(within(firstColumn).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(firstColumn).getByPlaceholderText(/card title/i), "Blocking card");
    await userEvent.click(within(firstColumn).getByRole("button", { name: /add card/i }));

    expect(
      within(firstColumn).queryByRole("button", { name: /delete to do column/i })
    ).not.toBeInTheDocument();
  });

  it("adds a comment to a card as the current user", async () => {
    render(<KanbanBoard username="alice" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Discuss scope");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    await userEvent.click(
      within(column).getByRole("button", { name: /toggle comments on discuss scope/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/write a comment/i),
      "Let's clarify requirements first"
    );
    await userEvent.click(within(column).getByRole("button", { name: /post comment/i }));

    expect(within(column).getByText("Let's clarify requirements first")).toBeInTheDocument();
    expect(within(column).getByText("alice")).toBeInTheDocument();
    await waitFor(() => {
      expect(updateBoard).toHaveBeenCalled();
    });
  });

  it("renames a column", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits a card's title and details", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "Original title"
    );
    await userEvent.click(
      within(column).getByRole("button", { name: /add card/i })
    );
    expect(within(column).getByText("Original title")).toBeInTheDocument();

    await userEvent.click(
      within(column).getByRole("button", { name: /edit original title/i })
    );

    const titleInput = within(column).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated title");
    const detailsInput = within(column).getByLabelText("Card details");
    await userEvent.clear(detailsInput);
    await userEvent.type(detailsInput, "Updated details");

    await userEvent.click(within(column).getByRole("button", { name: /save/i }));

    expect(within(column).getByText("Updated title")).toBeInTheDocument();
    expect(within(column).getByText("Updated details")).toBeInTheDocument();
    expect(within(column).queryByText("Original title")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(updateBoard).toHaveBeenCalled();
    });
  });

  it("cancels editing a card without saving changes", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "Keep me"
    );
    await userEvent.click(
      within(column).getByRole("button", { name: /add card/i })
    );

    await userEvent.click(
      within(column).getByRole("button", { name: /edit keep me/i })
    );
    const titleInput = within(column).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Should not save");

    await userEvent.click(within(column).getByRole("button", { name: /cancel/i }));

    expect(within(column).getByText("Keep me")).toBeInTheDocument();
    expect(within(column).queryByText("Should not save")).not.toBeInTheDocument();
  });

  it("adds a card with a due date and priority", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Ship release");
    await userEvent.type(within(column).getByLabelText("Due date"), "2099-01-15");
    await userEvent.selectOptions(within(column).getByLabelText("Priority"), "high");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("Ship release")).toBeInTheDocument();
    expect(within(column).getByText("High")).toBeInTheDocument();
    expect(within(column).getByText("2099-01-15")).toBeInTheDocument();
  });

  it("edits a card to set and then clear priority and due date", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Plain card");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    await userEvent.click(within(column).getByRole("button", { name: /edit plain card/i }));
    await userEvent.type(within(column).getByLabelText("Due date"), "2099-06-01");
    await userEvent.selectOptions(within(column).getByLabelText("Priority"), "medium");
    await userEvent.click(within(column).getByRole("button", { name: /save/i }));

    expect(within(column).getByText("Medium")).toBeInTheDocument();
    expect(within(column).getByText("2099-06-01")).toBeInTheDocument();

    // Clear both fields back out
    await userEvent.click(within(column).getByRole("button", { name: /edit plain card/i }));
    await userEvent.clear(within(column).getByLabelText("Due date"));
    await userEvent.selectOptions(within(column).getByLabelText("Priority"), "");
    await userEvent.click(within(column).getByRole("button", { name: /save/i }));

    expect(within(column).queryByText("Medium")).not.toBeInTheDocument();
    expect(within(column).queryByText("2099-06-01")).not.toBeInTheDocument();
  });

  it("filters cards by search text and clears back to all cards", async () => {
    (fetchBoard as any).mockResolvedValue({
      columns: [{ id: "col1", title: "To Do", cardIds: ["card-a", "card-b"] }],
      cards: {
        "card-a": { id: "card-a", title: "Fix login bug", details: "" },
        "card-b": { id: "card-b", title: "Write onboarding docs", details: "" },
      },
    });

    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Search cards"), "login");

    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.queryByText("Write onboarding docs")).not.toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 2 cards/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Write onboarding docs")).toBeInTheDocument();
  });

  it("filters cards by priority", async () => {
    (fetchBoard as any).mockResolvedValue({
      columns: [{ id: "col1", title: "To Do", cardIds: ["card-a", "card-b"] }],
      cards: {
        "card-a": { id: "card-a", title: "Urgent fix", details: "", priority: "high" },
        "card-b": { id: "card-b", title: "Nice to have", details: "", priority: "low" },
      },
    });

    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("Urgent fix")).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText("Filter by priority"), "high");

    expect(screen.getByText("Urgent fix")).toBeInTheDocument();
    expect(screen.queryByText("Nice to have")).not.toBeInTheDocument();
  });

  it("shows a 'no cards match' message distinct from the empty-column message", async () => {
    (fetchBoard as any).mockResolvedValue({
      columns: [
        { id: "col1", title: "To Do", cardIds: ["card-a"] },
        { id: "col2", title: "Done", cardIds: [] },
      ],
      cards: {
        "card-a": { id: "card-a", title: "Something", details: "" },
      },
    });

    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("Something")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Search cards"), "nonexistent");

    const columns = screen.getAllByTestId(/column-/i);
    expect(within(columns[0]).getByText("No cards match your filters")).toBeInTheDocument();
    expect(within(columns[1]).getByText("Drop a card here")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    expect(screen.getByText("Loading your board...")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    (fetchBoard as any).mockRejectedValue(new Error("Network error"));
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load board")).toBeInTheDocument();
    });
  });

  it("switches to a newly created board", async () => {
    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("My Board")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /my board/i }));
    await userEvent.click(screen.getByRole("button", { name: /new board/i }));
    await userEvent.type(screen.getByLabelText("New board name"), "Marketing");
    await userEvent.click(screen.getByRole("button", { name: /create board/i }));

    expect(createBoard).toHaveBeenCalledWith("Marketing");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "New Board" })).toBeInTheDocument();
    });
  });

  it("switches boards and reloads that board's data", async () => {
    (listBoards as any).mockResolvedValue([
      { id: 1, name: "My Board" },
      { id: 2, name: "Marketing" },
    ]);
    (fetchBoard as any).mockImplementation((boardId: number) =>
      Promise.resolve(
        boardId === 2
          ? { columns: DEFAULT_BOARD.columns, cards: {} }
          : DEFAULT_BOARD
      )
    );

    render(<KanbanBoard username="testuser" onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("My Board")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /my board/i }));
    await userEvent.click(screen.getByRole("option", { name: "Marketing" }));

    await waitFor(() => {
      expect(fetchBoard).toHaveBeenCalledWith(2);
    });
    await waitFor(() => {
      expect(screen.getByText("Marketing")).toBeInTheDocument();
    });
  });
});
