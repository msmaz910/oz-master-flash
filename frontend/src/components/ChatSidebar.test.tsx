import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { ChatSidebar } from "@/components/ChatSidebar";

vi.mock("@/lib/api", () => ({
  sendChatMessage: vi.fn(),
}));

import { sendChatMessage } from "@/lib/api";

describe("ChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a message and renders AI response", async () => {
    (sendChatMessage as any).mockResolvedValue({
      response: "Sure, I can do that.",
      boardUpdated: false,
    });

    render(<ChatSidebar boardId={1} onBoardUpdated={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText(/ask ai to update your board/i),
      "Move card-1 to done"
    );
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("Move card-1 to done")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Sure, I can do that.")).toBeInTheDocument();
    });
    expect(sendChatMessage).toHaveBeenCalledWith(1, "Move card-1 to done");
  });

  it("refreshes board when AI reports update", async () => {
    const onBoardUpdated = vi.fn().mockResolvedValue(undefined);
    (sendChatMessage as any).mockResolvedValue({
      response: "Board updated.",
      boardUpdated: true,
    });

    render(<ChatSidebar boardId={1} onBoardUpdated={onBoardUpdated} />);

    await userEvent.type(
      screen.getByPlaceholderText(/ask ai to update your board/i),
      "Move card-2 to review"
    );
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(onBoardUpdated).toHaveBeenCalledTimes(1);
    });
  });
});
