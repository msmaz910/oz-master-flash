// API functions for auth and board operations.
// The board column is stored as a JSON string, so responses carry `board` as a
// string that still needs parsing — see "double-serialized board" in CLAUDE.md.

import type { BoardData } from "@/lib/kanban";

export type { BoardData };

export type BoardSummary = {
  id: number;
  name: string;
};

export type ChatResponse = {
  response: string;
  boardUpdated: boolean;
};

export type AuthResult = {
  token: string;
  username: string;
};

const AUTH_TOKEN_KEY = "pm-auth-token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const errorData = await response.json().catch(() => null);
  return errorData?.detail || fallback;
}

type ApiRequestInit = {
  method?: string;
  body?: unknown;
  errorMessage: string;
};

/** Authenticated JSON request; throws the server's `detail` (or `errorMessage`) on failure. */
async function apiRequest<T>(path: string, options: ApiRequestInit): Promise<T> {
  const { method = "GET", body, errorMessage } = options;
  const headers: Record<string, string> = { ...authHeader() };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, errorMessage));
  }
  return response.json();
}

/** Login and register are the only unauthenticated calls, and share a body shape. */
async function postCredentials(
  path: string,
  username: string,
  password: string,
  errorMessage: string
): Promise<AuthResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, errorMessage));
  }
  return response.json();
}

export function login(username: string, password: string): Promise<AuthResult> {
  return postCredentials(
    "/api/auth/login",
    username,
    password,
    "Invalid username or password"
  );
}

export function register(username: string, password: string): Promise<AuthResult> {
  return postCredentials(
    "/api/auth/register",
    username,
    password,
    "Failed to create account"
  );
}

export async function logout(): Promise<void> {
  // Best-effort: a failed logout still clears the token on the client.
  await fetch("/api/auth/logout", { method: "POST", headers: authHeader() });
}

export function fetchCurrentUser(): Promise<{ username: string }> {
  return apiRequest("/api/auth/me", { errorMessage: "Not authenticated" });
}

export function listBoards(): Promise<BoardSummary[]> {
  return apiRequest("/api/boards", { errorMessage: "Failed to fetch boards" });
}

export async function createBoard(
  name?: string
): Promise<{ id: number; name: string; board: BoardData }> {
  const data = await apiRequest<{ id: number; name: string; board: string }>("/api/boards", {
    method: "POST",
    body: { name },
    errorMessage: "Failed to create board",
  });
  return { id: data.id, name: data.name, board: JSON.parse(data.board) };
}

export async function fetchBoard(boardId: number): Promise<BoardData> {
  const data = await apiRequest<{ board: string }>(`/api/boards/${boardId}`, {
    errorMessage: "Failed to fetch board",
  });
  return JSON.parse(data.board);
}

export async function updateBoard(boardId: number, board: BoardData): Promise<void> {
  await apiRequest(`/api/boards/${boardId}`, {
    method: "PUT",
    body: { board },
    errorMessage: "Failed to update board",
  });
}

export async function renameBoard(boardId: number, name: string): Promise<void> {
  await apiRequest(`/api/boards/${boardId}`, {
    method: "PUT",
    body: { name },
    errorMessage: "Failed to rename board",
  });
}

export async function deleteBoard(boardId: number): Promise<void> {
  await apiRequest(`/api/boards/${boardId}`, {
    method: "DELETE",
    errorMessage: "Failed to delete board",
  });
}

export function sendChatMessage(boardId: number, question: string): Promise<ChatResponse> {
  return apiRequest("/api/ai/chat", {
    method: "POST",
    body: { question, boardId },
    errorMessage: "Failed to send chat message",
  });
}
