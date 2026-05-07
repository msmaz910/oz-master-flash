# Code Review Report: Kanban Studio PM App

**Reviewed:** 2026-05-05
**Scope:** Full stack — backend (Python/FastAPI), frontend (Next.js/React/TypeScript), tests, infrastructure
**Total issues found:** 33 (3 Critical, 6 High, 11 Medium, 13 Low)

---

## Executive Summary

This is a clean, well-scoped MVP. The architecture is coherent, the code is readable, and the component decomposition is sensible. The drag-and-drop logic was carefully thought through (the `moveCard` normalisation approach is a solid solution to a known @dnd-kit edge case).

That said, there are three critical issues that must be addressed before any real use: an API key is effectively bundled into the Docker image, a validation gap lets the AI silently destroy all board columns, and the blocking synchronous OpenAI client is called from an async FastAPI handler — which will stall the entire server under load.

Several high-severity issues relate to UX correctness: a transient save failure replaces the entire board with a dead-end error screen, and `syncBoard` is fired inside React state updater functions (a purity violation that doubles API calls in Strict Mode).

The test suite is functional but has meaningful gaps: backend tests share the real production database, the e2e "drag" test doesn't actually drag anything, and ChatSidebar error paths are entirely untested.

---

## Section 1: Backend API (`backend/main.py`)

### CRITICAL-1 — AI validation allows complete column deletion (data loss)
**File:** `backend/main.py:94–125`

`validate_board_update` checks that each column ID in the update exists in the current board, but does **not** check that all current columns are represented. An AI response that omits columns passes validation cleanly:

```
current  = { columns: [col-1, col-2, col-3], ... }
AI sends = { columns: [],                    cards: {} }
-> validate_board_update returns (True, "")
-> board saved with zero columns
```

Any misbehaving or confused LLM response that omits columns silently wipes the user's board.

**Fix:** Add a check that the set of column IDs in the updated board equals the set in the current board. Column creation and deletion should be explicit, not permitted by omission.

---

### HIGH-2 — `KeyError` 500 on malformed PUT body
**File:** `backend/main.py:85`

```python
board_content = board_data["board"]
```

If the request body does not contain a `"board"` key, Python raises `KeyError` which FastAPI converts to a generic 500. The endpoint accepts `board_data: dict` instead of a typed Pydantic model, bypassing automatic validation.

**Fix:** Replace `board_data: dict` with a Pydantic model, or add explicit key-checking with `HTTPException(status_code=422)`.

---

### HIGH-3 — Blocking synchronous OpenAI client in async endpoint
**File:** `backend/ai_service.py:21, 86`; `backend/main.py:163`

`AIService` uses `openai.OpenAI(...)` (the synchronous client) but `chat_with_kanban` and `test_connection` are declared `async def` and awaited from async FastAPI handlers. Calling `self.client.chat.completions.create(...)` is a blocking network call that runs on the asyncio event loop thread and blocks the entire FastAPI server for the duration of the LLM round-trip (potentially 5–30 seconds). All other requests queue behind it.

**Fix:** Switch to `openai.AsyncOpenAI(...)` and `await self.client.chat.completions.create(...)`, or wrap the synchronous call with `asyncio.to_thread(...)`.

---

### MEDIUM-4 — Duplicate `import json` inside function body
**File:** `backend/main.py:8, 87`

`json` is already imported at module level (line 8). There is a redundant `import json` inside the `update_board` function body at line 87.

**Fix:** Remove the inner import.

---

### MEDIUM-5 — Pydantic models defined but never used in route signatures
**File:** `backend/main.py:18–34`

`BoardColumn`, `BoardCard`, `BoardData`, and `AIStructuredResponse` are defined but no route uses them as parameter types. The `PUT /api/board` endpoint accepts `dict` instead of `BoardData`. These models represent the intended schema but are disconnected from enforcement.

**Fix:** Either wire them into route signatures (replace `board_data: dict` with a typed model) or remove them to avoid misleading future readers.

---

### MEDIUM-6 — `@app.on_event("startup")` is deprecated
**File:** `backend/main.py:42`

FastAPI deprecated `@app.on_event` in version 0.93 in favour of the `lifespan` context manager pattern. This generates a deprecation warning with the current FastAPI 0.115.

**Fix:** Replace with a `@asynccontextmanager` lifespan function.

---

### LOW-7 — Unauthenticated arbitrary-prompt endpoint
**File:** `backend/main.py:51–58`

`POST /api/ai/test?prompt=<anything>` forwards arbitrary user-controlled text to the LLM with no authentication and no rate limiting. It consumes API key budget without restriction.

**Fix:** Remove the endpoint (it served its scaffolding purpose), or gate it behind auth.

---

## Section 2: Database / Models (`backend/models.py`)

### MEDIUM-8 — Deprecated `declarative_base` import
**File:** `backend/models.py:2`

```python
from sqlalchemy.ext.declarative import declarative_base
```

This import path was deprecated in SQLAlchemy 1.4 and removed in 2.0. The project pins SQLAlchemy 2.0.35, so this works only via a compatibility shim.

**Fix:** Replace with `from sqlalchemy.orm import DeclarativeBase` and update `Base` to `class Base(DeclarativeBase): pass`.

---

### MEDIUM-9 — `datetime.utcnow()` deprecated in Python 3.12
**File:** `backend/models.py:18, 28, 29, 41, 42`

`datetime.utcnow()` is deprecated since Python 3.12. The Dockerfile uses Python 3.12-slim.

**Fix:** Replace all five occurrences with `datetime.now(timezone.utc)` (importing `timezone` from `datetime`).

---

## Section 3: AI Service (`backend/ai_service.py`)

### MEDIUM-10 — Fragile JSON extraction via `find`/`rfind`
**File:** `backend/ai_service.py:98–110`

```python
json_start = content.find('{')
json_end = content.rfind('}') + 1
```

This breaks on any response that wraps JSON in a markdown code fence (` ```json\n{...}\n``` `), contains prose with JSON-like fragments, or whose first `{` and last `}` belong to different objects. The result is a JSON parse error silently falling back to plain text — losing any board update.

**Fix:** Use `response_format={"type": "json_object"}` (supported by OpenRouter for GPT-based models) to guarantee valid JSON output, eliminating the need for extraction entirely.

---

### MEDIUM-11 — Board context appended inline corrupts conversation history
**File:** `backend/ai_service.py:77–83`; `backend/main.py:180`

The board state is appended to the last user message for the LLM call, but the stored history only records the bare question (`request.question`). On subsequent turns, the AI's conversation history shows raw questions with no board context, making continuity unreliable. Additionally, `json.dumps(board_state, indent=2)` adds significant token overhead on every request.

**Fix:** Inject board state as a system message instead of modifying the user message. Store the full contextualised message in history. Remove `indent=2` from the board JSON to reduce token count.

---

### MEDIUM-12 — Unbounded conversation history growth
**File:** `backend/main.py:179–183`

Two messages are appended to history on every turn and the full history is re-sent to the LLM on every call. After many turns, requests will exceed the model's context window or hit token limits.

**Fix:** Trim history to the most recent N turns (e.g. last 20 messages) before building the request.

---

## Section 4: Security

### CRITICAL-13 — API key baked into Docker image
**File:** `Dockerfile:17`

```dockerfile
COPY .env ./
```

The `.env` file containing `OPENROUTER_API_KEY` is copied directly into the image. Anyone who pulls or inspects the image can extract the key with `docker run pm-app cat .env`.

**Fix:** Remove `COPY .env ./` from the Dockerfile. Pass the key at runtime via `docker run -e OPENROUTER_API_KEY=...` or `--env-file`. The `os.getenv("OPENROUTER_API_KEY")` call in `ai_service.py` already reads from environment variables — no code change needed.

---

### HIGH-14 — Hardcoded credentials with hint on login screen
**File:** `frontend/src/app/page.tsx:17`; `frontend/src/components/Login.tsx:80`

```tsx
if (username === "user" && password === "password") { ... }
```

Credentials are embedded in client-side JavaScript. Auth is enforced only in the browser via `localStorage`. The backend has no session validation — all API endpoints are accessible without any token. The login page also displays the credentials explicitly as a demo hint. Documented as intentional MVP scope, but worth flagging for any future network exposure.

---

## Section 5: Frontend Components

### HIGH-15 — Transient save failure replaces entire board UI
**File:** `frontend/src/components/KanbanBoard.tsx:42–51, 160–174`

`syncBoard` sets `error` state on failure. The component renders a full-page replacement whenever `error` is non-null, causing a single transient network error while dragging to wipe the entire board from view and replace it with an error screen and a hard reload button. All unsaved changes are lost.

**Fix:** Separate `loadError` (which should block rendering) from `syncError` (which should show a non-destructive toast/banner while keeping the board functional).

---

### HIGH-16 — `syncBoard` called inside `setState` updater (impure updater, double API calls in Strict Mode)
**File:** `frontend/src/components/KanbanBoard.tsx:84–90, 101, 119, 142`

All four mutating handlers call `syncBoard` inside the `setBoard(prev => { ... })` updater:

```tsx
setBoard((prev) => {
  const result = moveCardInBoard(prev, ...);
  if (result) {
    syncBoard(result);  // side effect inside pure updater
  }
  return result || prev;
});
```

React's state updater functions must be pure. In React 18+ Strict Mode, updaters are invoked twice in development, causing two `PUT /api/board` calls per user action.

**Fix:** Compute the next state first, then call `setBoard` with the value (not an updater function), then call `syncBoard` separately:

```tsx
const result = moveCardInBoard(board, active.id, over.id);
if (result) {
  setBoard(result);
  syncBoard(result);
}
```

---

### MEDIUM-17 — Column rename fires API call on every keystroke (no debounce)
**File:** `frontend/src/components/KanbanBoard.tsx:93–104`; `frontend/src/components/KanbanColumn.tsx:43–44`

The column title `<input>` calls `onRename` on every `onChange`, immediately calling `setBoard` and `syncBoard`. Typing a 15-character name triggers 15 API calls (30 in Strict Mode due to issue HIGH-16).

**Fix:** Debounce `syncBoard` for the column title input (300–500 ms), or only sync on `onBlur`.

---

### MEDIUM-18 — `board.cards[cardId]` can be `undefined` — no null guard
**File:** `frontend/src/components/KanbanBoard.tsx:244`

```tsx
cards={column.cardIds.map((cardId) => board.cards[cardId])}
```

If `board.cards` does not contain a key in `column.cardIds` (possible after a malformed AI update), this produces `undefined` entries. `KanbanCard` then crashes accessing `card.id`, `card.title`, etc.

**Fix:** Filter nullish values: `column.cardIds.map(id => board.cards[id]).filter(Boolean)`.

---

### LOW-19 — Redundant `useMemo` for trivial values
**File:** `frontend/src/components/KanbanBoard.tsx:70`; `frontend/src/components/ChatSidebar.tsx:20`

```tsx
const cardsById = useMemo(() => board.cards, [board.cards]);   // just an alias
const hasMessages = useMemo(() => messages.length > 0, [messages.length]);  // trivial boolean
```

Both add overhead without preventing recalculation. Replace with plain variable assignments.

---

### LOW-20 — No CORS middleware for non-Docker development
**File:** `backend/main.py`

Running `npm run dev` (port 3000) alongside `uvicorn` (port 8000) causes all API calls to fail with CORS errors. No `CORSMiddleware` is configured and there is no Next.js dev proxy.

**Fix:** Add `CORSMiddleware` gated by a `DEV_MODE` env var, or add a `rewrites` rule in `next.config.ts` for the dev server.

---

## Section 6: Tests

### MEDIUM-21 — Backend tests mutate the real production database
**File:** `backend/conftest.py`; `backend/test_main.py`

`conftest.py` calls `init_db()` on the real `kanban.db` file. `test_update_board` adds a `"test-card"` and does not clean up. Running `pytest` against a live database corrupts production data.

**Fix:** Override the database URL in `conftest.py` to use a temporary file or in-memory SQLite (`:memory:`). Use function-scoped fixtures that reset state between tests.

---

### LOW-22 — E2E drag test does not actually drag
**File:** `frontend/tests/kanban.spec.ts:43–61`

The test titled "moves a card between columns" adds a card and asserts it remains visible in the same column. No drag gesture is attempted. Drag-and-drop behaviour is never e2e tested.

**Fix:** Rename the test to reflect what it checks ("card persists after add"), or implement a real Playwright drag test using `page.dragAndDrop()`.

---

### LOW-23 — ChatSidebar tests do not cover error paths
**File:** `frontend/src/components/ChatSidebar.test.tsx`

No test covers: a rejected `sendChatMessage` promise, the disabled state during sending, or the error message bubble shown on failure.

---

### LOW-24 — KanbanBoard rename test does not assert persistence
**File:** `frontend/src/components/KanbanBoard.test.tsx:42–52`

The rename test asserts the DOM updates but never asserts that `updateBoard` was called. A regression breaking persistence would not be caught.

---

### LOW-25 — No coverage thresholds configured
**File:** `frontend/vitest.config.ts`

`coverage.reporter` is set but `coverage.thresholds` is absent. Coverage can drop to 0% without any CI gate failing.

---

## Section 7: Infrastructure / Docker

### HIGH-26 — No Docker volume: all data lost on container restart
**File:** `Dockerfile`; `scripts/start.sh`

`kanban.db` is created inside the container at `/app/kanban.db`. When the container is stopped and removed (which `stop.sh` does), the database is deleted. `start.sh` runs a fresh `docker build` and `docker run` each time, so every start produces a blank database.

**Fix:** Mount the database to a host path: `docker run -v $(pwd)/data:/app/data ...` and set `DATABASE_URL = "sqlite:///./data/kanban.db"` in `models.py`. Alternatively, use a named Docker volume.

---

### LOW-27 — `start.sh` fails silently if container name already exists
**File:** `scripts/start.sh`

`docker run --name pm-container` fails with a conflict error if a stopped container with that name exists. The script has no guard.

**Fix:** Add `docker rm -f pm-container 2>/dev/null || true` before the `docker run` line.

---

### LOW-28 — Node.js installed via `apt-get` (potentially outdated)
**File:** `Dockerfile:4`

Debian Bookworm's APT repository ships Node.js 18.x at best; older versions may be present. Next.js 16 works best on Node 20 LTS.

**Fix:** Use NodeSource setup script for Node 20, or use a multi-stage build with `node:20-slim` for the frontend build step.

---

### LOW-29 — Build artifacts committed to git
**File:** `backend/static/`; `backend/kanban.db` (if present)

`backend/static/` (compiled JS bundles) and `backend/kanban.db` should not be tracked in version control. The `.gitignore` excludes `db.sqlite3` (Django convention) but not `kanban.db`.

**Fix:** Add `backend/static/`, `frontend/out/`, and `backend/kanban.db` to `.gitignore`. Remove any already-tracked build artifacts with `git rm -r --cached`.

---

## Section 8: Documentation

### LOW-30 — CLAUDE.md incorrectly describes double JSON parse
**File:** `CLAUDE.md` (Data flow quirk section)

The CLAUDE.md states the frontend "must parse twice" with `JSON.parse(JSON.parse(data.board))`. In reality `api.ts` performs a single `JSON.parse(data.board)` correctly. The double-parse description is inaccurate and would cause a runtime error if followed.

**Fix:** Update CLAUDE.md to reflect the actual single-parse implementation.

---

## Prioritised Action List

### Sprint 1 — Must Fix Before Any Real Use

| # | Severity | Action |
|---|----------|--------|
| 1 | CRITICAL | Rotate the OpenRouter API key; remove `COPY .env ./` from Dockerfile; pass key via `docker run -e` |
| 2 | CRITICAL | Add column-set equality check to `validate_board_update` — prevent AI from silently deleting columns |
| 3 | HIGH | Switch `openai.OpenAI` to `openai.AsyncOpenAI`; add `await` to all LLM calls |
| 4 | HIGH | Add Docker volume mount for `kanban.db` to persist data across container restarts |
| 5 | HIGH | Separate `loadError` from `syncError` in `KanbanBoard` — don't replace board UI on save failure |
| 6 | HIGH | Move `syncBoard` calls out of `setState` updater functions |
| 7 | HIGH | Add `KeyError` guard to `PUT /api/board` or replace `dict` with a Pydantic model |

### Sprint 2 — Quality & Correctness

| # | Severity | Action |
|---|----------|--------|
| 8 | MEDIUM | Debounce column rename to prevent per-keystroke API calls |
| 9 | MEDIUM | Add null-filter to `board.cards[cardId]` mapping in `KanbanBoard` |
| 10 | MEDIUM | Fix backend tests: use in-memory SQLite, not the real `kanban.db` |
| 11 | MEDIUM | Cap conversation history at ~20 messages before sending to LLM |
| 12 | MEDIUM | Replace `find`/`rfind` JSON extraction with `response_format={"type": "json_object"}` |
| 13 | MEDIUM | Replace deprecated `declarative_base`, `datetime.utcnow()`, and `@app.on_event` |
| 14 | MEDIUM | Replace `board_data: dict` with a typed Pydantic model in `PUT /api/board` |
| 15 | MEDIUM | Remove unused Pydantic models or wire them into route signatures |

### Sprint 3 — Test Coverage & Polish

| # | Severity | Action |
|---|----------|--------|
| 16 | LOW | Rename or fix the e2e "moves a card" test; add a real Playwright drag test |
| 17 | LOW | Add ChatSidebar tests for error state and send-in-progress disabled state |
| 18 | LOW | Add `updateBoard` mock assertion to the rename column unit test |
| 19 | LOW | Add `.gitignore` entries for `backend/static/`, `frontend/out/`, `backend/kanban.db` |
| 20 | LOW | Fix `start.sh` container name conflict guard; upgrade Node.js in Dockerfile to v20 |
| 21 | LOW | Remove the duplicate `import json` at `main.py:87` |
| 22 | LOW | Remove redundant `useMemo` for `cardsById` and `hasMessages` |
| 23 | LOW | Fix CLAUDE.md double-parse documentation error |
| 24 | LOW | Add CORS middleware or Next.js dev proxy for local development without Docker |
| 25 | LOW | Remove `POST /api/ai/test` endpoint or gate it behind auth |