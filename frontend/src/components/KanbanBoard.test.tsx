import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { vi } from "vitest";

// Mock the API functions
vi.mock("@/lib/api", () => ({
  fetchBoard: vi.fn(),
  updateBoard: vi.fn(),
}));

import { fetchBoard, updateBoard } from "@/lib/api";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful fetch
    (fetchBoard as any).mockResolvedValue({
      columns: [
        { id: "col1", title: "To Do", cardIds: [] },
        { id: "col2", title: "In Progress", cardIds: [] },
        { id: "col3", title: "Review", cardIds: [] },
        { id: "col4", title: "Done", cardIds: [] },
        { id: "col5", title: "Archive", cardIds: [] },
      ],
      cards: {},
    });
    (updateBoard as any).mockResolvedValue(undefined);
  });

  it("renders five columns after loading", async () => {
    render(<KanbanBoard onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
  });

  it("renames a column", async () => {
    render(<KanbanBoard onLogout={mockOnLogout} />);
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
    render(<KanbanBoard onLogout={mockOnLogout} />);
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
    render(<KanbanBoard onLogout={mockOnLogout} />);
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
    render(<KanbanBoard onLogout={mockOnLogout} />);
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

  it("shows loading state initially", () => {
    render(<KanbanBoard onLogout={mockOnLogout} />);
    expect(screen.getByText("Loading your board...")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    (fetchBoard as any).mockRejectedValue(new Error("Network error"));
    render(<KanbanBoard onLogout={mockOnLogout} />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load board")).toBeInTheDocument();
    });
  });
});
