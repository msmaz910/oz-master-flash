# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Project Management web app: multi-user accounts, each with multiple Kanban boards, plus an AI chat assistant that can propose board updates. Docker-first deployment.

**Stack**: Next.js 16 (React 19, TypeScript, Tailwind 4) + FastAPI (Python, SQLAlchemy, SQLite) + OpenRouter LLM

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev           # dev server
npm run build         # static export → out/
npm run test:unit     # Vitest (jsdom)
npm run test:e2e      # Playwright — requires Docker running on :8000
npm run test:all      # both
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload    # dev server on :8000
pytest test_main.py          # backend tests
```

### Docker (full-stack)
```bash
docker build -t pm-app .
docker run -d --name pm-container -p 8000:8000 pm-app
# App at http://localhost:8000
```

## Architecture

The Dockerfile builds the Next.js app as a static export (`out/`), copies it into `backend/static/`, then serves everything from the FastAPI server on port 8000. FastAPI serves static files at `/` and API routes at `/api/*`.

### Key directories
- `frontend/src/components/` — React components (KanbanBoard, ChatSidebar, Login, etc.)
- `frontend/src/lib/` — `kanban.ts` (board logic), `api.ts` (fetch wrappers)
- `frontend/tests/` — Playwright e2e tests
- `backend/main.py` — all FastAPI routes
- `backend/models.py` — SQLAlchemy ORM: User (1:N) → Board (JSON) → Conversation; also `UserSession` (bearer tokens)
- `backend/security.py` — password hashing (PBKDF2-HMAC-SHA256, stdlib only) and session token generation
- `backend/ai_service.py` — OpenRouter client and prompt logic

### Data flow quirk: double-serialized board
The backend stores board state as a JSON string in the `board` column. The API returns `{"board": "{\"columns\": [...]}"}` — a JSON string inside JSON. The frontend must parse twice:
```ts
const board = JSON.parse(JSON.parse(data.board));
```
When saving, send `{ board: JSON.stringify(boardObject) }` or `{ board: boardObject }` — the endpoint accepts both.

### AI integration
`/api/ai/chat` takes a `boardId` plus the user's question, and passes that board's state + conversation history to the LLM. The LLM responds with structured JSON: `{ "response": "...", "kanbanUpdate": {...} }`. The server validates `kanbanUpdate` via `validate_board_update()` before persisting. If JSON parsing fails, the raw text is returned as a plain chat message.

### Auth
Real multi-user auth: `POST /api/auth/register` and `POST /api/auth/login` return a bearer token backed by a `sessions` row; `GET /api/auth/me` and every board/chat endpoint resolve the acting user from `Authorization: Bearer <token>` via the `get_current_user` FastAPI dependency in `main.py`. The frontend stores the token in `localStorage` (`frontend/src/lib/api.ts`) and attaches it to every request. A demo account (`user` / `password`) is still seeded on startup for convenience.

### Database init
On startup, `init_db()` creates tables, runs lightweight `ALTER TABLE` migrations for columns added after the initial schema (`boards.name`, `users.password_hash`), and seeds the demo user + one default board with 5 columns if they don't already exist. Boards are 1:N per user — see `/api/boards*` routes in `main.py` and the `BoardSwitcher` component on the frontend.

## Environment

Create `backend/.env` with:
```
OPENROUTER_API_KEY=your_key_here
```

The backend loads this via `python-dotenv` at startup.

## Testing notes

- Playwright e2e tests have no built-in `webServer` — they expect Docker running at `http://127.0.0.1:8000` before you run them.
- Vitest unit tests are isolated (jsdom) and don't require the backend.
- Backend pytest uses `TestClient` with mocked DB and API calls.
