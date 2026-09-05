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
- `frontend/src/components/` — React components: `KanbanBoard` (top-level board screen and all board-mutation handlers), `KanbanColumn`, `KanbanCard` (+ `CardComments`), `BoardSwitcher`, `AddColumnForm`, `NewCardForm`, `FilterBar`, `ActivityPanel`, `ChatSidebar`, `Login`
- `frontend/src/lib/` — `kanban.ts` (board/card data model, drag logic, filters, labels, activity log — all pure functions, see below), `api.ts` (fetch wrappers + auth token storage)
- `frontend/tests/` — Playwright e2e tests (`kanban.spec.ts`)
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

### Card data model — extend the JSON blob, not the backend
Beyond `id`/`title`/`details`, a `Card` (see `frontend/src/lib/kanban.ts`) carries `dueDate`, `priority` (`low`/`medium`/`high`), `labels` (free-text strings, colored via a stable hash in `labelColorFor`), and `comments` (`{id, author, text, createdAt}[]`). A `BoardData` also carries `activity` (`{id, message, author, createdAt}[]`, newest first, capped at `MAX_ACTIVITY_ENTRIES`). None of this is validated or even typed on the backend — `PUT /api/boards/{id}` accepts `board: Any` and stores whatever JSON it's given, and `validate_board_update()` (used only on the AI-chat path) checks structure (column/card id references) but never looks at card fields. So when adding a new per-card or per-board attribute, the established pattern is: add it to the `Card`/`BoardData` type in `kanban.ts`, thread it through the relevant component props and `KanbanBoard` handlers, and leave the backend alone — no migration needed unless the field lives on `User`/`Board`/`Conversation` columns themselves (i.e., is queried/filtered in SQL, like `Board.name`).

### Card search/filtering
`CardFilters` (query text, priority, label, overdue-only) and `cardMatchesFilters()` in `kanban.ts` are pure and unit-tested directly — prefer adding new filter dimensions there over ad hoc logic in components. Filtering is display-only: `KanbanBoard` filters the `cards` array it passes to each `KanbanColumn` (and that column's dnd-kit `SortableContext` derives its `items` from that same filtered list), but never touches `board.cards`/`board.columns`, so clearing filters always restores everything losslessly.

### Column management
Columns can be created (`AddColumnForm`) and deleted, but a column can only be deleted when it has zero cards and it isn't the board's last column (`KanbanColumn`'s delete control is simply not rendered otherwise) — this avoids needing a confirmation dialog while still making data loss impossible by construction. Reordering cards within a column isn't logged to `activity`; only column-to-column moves are.

## Environment

Create `backend/.env` with:
```
OPENROUTER_API_KEY=your_key_here
```

The backend loads this via `python-dotenv` at startup.

## Testing notes

- Playwright e2e tests have no built-in `webServer` — they expect Docker running at `http://127.0.0.1:8000` before you run them.
- Vitest unit tests are isolated (jsdom) and don't require the backend.
- Backend pytest uses `TestClient` against a real in-memory SQLite DB (see `conftest.py`), seeded with the demo user/board once per test session. Board/chat endpoints require auth — get a token via `POST /api/auth/login` first (or use the module-scoped `auth_headers` pytest fixture already in `test_main.py`).
- **dnd-kit accessible-name gotcha**: `useSortable`'s spread `attributes` put `role="button"` on the draggable card `<article>`, and browsers compute its accessible name by concatenating descendant text/labels — including the Edit/Delete/Comments buttons' own `aria-label`s. A Playwright/Testing-Library `getByRole("button", { name: "Delete X" })` without `exact: true` will match both that inner button *and* the whole card article, throwing a strict-mode/multiple-elements error. Always pass `exact: true` (or a `RegExp` anchored enough to not appear in the aggregated name) when targeting a button living inside a `KanbanCard`.
- The e2e container's SQLite DB persists across separate `npm run test:e2e` invocations (no reset between runs) — tests that assert exact counts (e.g., "5 columns") assume a fresh container; tests that create their own data use `Date.now()`-suffixed titles/labels to stay collision-free across repeated runs on the same container.
