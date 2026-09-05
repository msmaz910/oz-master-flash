// API functions for auth and board operations

export interface BoardData {
  columns: {
    id: string;
    title: string;
    cardIds: string[];
  }[];
  cards: Record<string, {
    id: string;
    title: string;
    details: string;
  }>;
}

export interface BoardSummary {
  id: number;
  name: string;
}

export interface ChatResponse {
  response: string;
  boardUpdated: boolean;
}

export interface AuthResult {
  token: string;
  username: string;
}

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

export async function login(username: string, password: string): Promise<AuthResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Invalid username or password'));
  }
  return response.json();
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to create account'));
  }
  return response.json();
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { ...authHeader() },
  });
}

export async function fetchCurrentUser(): Promise<{ username: string }> {
  const response = await fetch('/api/auth/me', {
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error('Not authenticated');
  }
  return response.json();
}

export async function listBoards(): Promise<BoardSummary[]> {
  const response = await fetch('/api/boards', {
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch boards');
  }
  return response.json();
}

export async function createBoard(name?: string): Promise<{ id: number; name: string; board: BoardData }> {
  const response = await fetch('/api/boards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to create board'));
  }
  const data = await response.json();
  return { id: data.id, name: data.name, board: JSON.parse(data.board) };
}

export async function fetchBoard(boardId: number): Promise<BoardData> {
  const response = await fetch(`/api/boards/${boardId}`, {
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch board');
  }
  const data = await response.json();
  return JSON.parse(data.board);
}

export async function updateBoard(boardId: number, board: BoardData): Promise<void> {
  const response = await fetch(`/api/boards/${boardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ board }),
  });
  if (!response.ok) {
    throw new Error('Failed to update board');
  }
}

export async function renameBoard(boardId: number, name: string): Promise<void> {
  const response = await fetch(`/api/boards/${boardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to rename board'));
  }
}

export async function deleteBoard(boardId: number): Promise<void> {
  const response = await fetch(`/api/boards/${boardId}`, {
    method: 'DELETE',
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to delete board'));
  }
}

export async function sendChatMessage(boardId: number, question: string): Promise<ChatResponse> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ question, boardId }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to send chat message'));
  }

  return response.json();
}
