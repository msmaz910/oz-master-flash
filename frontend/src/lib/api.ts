// API functions for board operations

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

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const errorData = await response.json().catch(() => null);
  return errorData?.detail || fallback;
}

export async function listBoards(): Promise<BoardSummary[]> {
  const response = await fetch('/api/boards');
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
  const response = await fetch(`/api/boards/${boardId}`);
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
    },
    body: JSON.stringify({ question, boardId }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to send chat message'));
  }

  return response.json();
}
