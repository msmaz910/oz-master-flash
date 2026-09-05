import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Login } from "@/components/Login";

vi.mock("@/lib/api", () => ({
  login: vi.fn(),
  register: vi.fn(),
  setAuthToken: vi.fn(),
}));

import { login, register, setAuthToken } from "@/lib/api";

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in with valid credentials", async () => {
    (login as any).mockResolvedValue({ token: "abc123", username: "user" });
    const onAuthenticated = vi.fn();

    render(<Login onAuthenticated={onAuthenticated} />);
    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user", "password");
    });
    expect(setAuthToken).toHaveBeenCalledWith("abc123");
    expect(onAuthenticated).toHaveBeenCalledWith("user");
  });

  it("shows an error on invalid credentials", async () => {
    (login as any).mockRejectedValue(new Error("Invalid username or password"));

    render(<Login onAuthenticated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid username or password")).toBeInTheDocument();
    });
  });

  it("switches to sign up mode and registers a new account", async () => {
    (register as any).mockResolvedValue({ token: "xyz789", username: "newperson" });
    const onAuthenticated = vi.fn();

    render(<Login onAuthenticated={onAuthenticated} />);
    await userEvent.click(screen.getByText(/need an account/i));

    await userEvent.type(screen.getByLabelText("Username"), "newperson");
    await userEvent.type(screen.getByLabelText("Password"), "securepass");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("newperson", "securepass");
    });
    expect(setAuthToken).toHaveBeenCalledWith("xyz789");
    expect(onAuthenticated).toHaveBeenCalledWith("newperson");
  });
});
