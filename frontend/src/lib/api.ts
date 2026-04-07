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

export async function fetchBoard(): Promise<BoardData> {
  const response = await fetch('/api/board');
  if (!response.ok) {
    throw new Error('Failed to fetch board');
  }
  const data = await response.json();
  return JSON.parse(data.board);
}

export async function updateBoard(board: BoardData): Promise<void> {
  const response = await fetch('/api/board', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ board: JSON.stringify(board) }),
  });
  if (!response.ok) {
    throw new Error('Failed to update board');
  }
}