# Code Review v2: Kanban Studio PM App

**Reviewed:** 2026-06-12
**Scope:** Full stack -- backend (Python/FastAPI), frontend (Next.js/React/TypeScript), tests, infrastructure, documentation
**Previous review:** `docs/code_review.md` (2026-05-05) -- 33 issues found
**Status this round:** 26 of 33 previous issues resolved; 7 remaining; 2 new findings

---

## Executive Summary

The codebase has improved significantly since the v1 review. All three critical issues and five of six high-severity issues have been fixed. The architecture remains clean and well-scoped for an MVP.

**What was fixed well:**
- AI column deletion validation now prevents data loss
- Async `OpenAI` client replaces the blocking synchronous version
- Docker volume mounts persist the database across container restarts
- API key is no longer baked into the Docker image
- Save errors show a banner instead of replacing the entire board UI
- `syncBoard` is no longer called inside React state updaters
- Backend tests use in-memory SQLite instead of the real database
- Deprecated APIs (`declarative_base`, `datetime.utcnow`, `@app.on_event`) have been replaced

**What remains:** 7 low-severity issues from v1 are still open, primarily in test coverage, documentation accuracy, and polish. Two new issues were identified.

---

## Previously Fixed Issues (26 of 33)

All of the following from `code_review.md` have been resolved and verified in the current codebase:

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| CRITICAL-1 | Critical | AI validation allows column deletion | Fixed |
| CRITICAL-13 | Critical | API key baked into Docker image | Fixed |
| HIGH-2 | High | KeyError 500 on malformed PUT body | Fixed |
| HIGH-3 | High | Blocking synchronous OpenAI client | Fixed |
| HIGH-15 | High | Transient save failure replaces board UI | Fixed |
| HIGH-16 | High | syncBoard inside setState updater | Fixed |
| HIGH-26 | High | No Docker volume (data lost on restart) | Fixed |
| MEDIUM-4 | Medium | Duplicate `import json` in main.py | Fixed |
| MEDIUM-6 | Medium | `@app.on_event("startup")` deprecated | Fixed |
| MEDIUM-8 | Medium | Deprecated `declarative_base` import | Fixed |
| MEDIUM-9 | Medium | `datetime.utcnow()` deprecated | Fixed |
| MEDIUM-10 | Medium | Fragile JSON extraction via find/rfind | Fixed |
| MEDIUM-11 | Medium | Board context appended inline, corrupts history | Fixed |
| MEDIUM-12 | Medium | Unbounded conversation history growth | Fixed |
| MEDIUM-17 | Medium | Column rename fires API call per keystroke | Fixed |
| MEDIUM-18 | Medium | `board.cards[cardId]` undefined -- no null guard | Fixed |
| MEDIUM-21 | Medium | Backend tests mutate real production database | Fixed |
| LOW-19 | Low | Redundant useMemo (cardsById in KanbanBoard) | Fixed |
| LOW-24 | Low | KanbanBoard rename test no persistence assertion | Fixed |
| LOW-27 | Low | start.sh fails silently if container exists | Fixed |
| LOW-28 | Low | Node.js installed via apt-get (outdated) | Fixed |
| LOW-29 | Low | Build artifacts committed to git | Fixed |
| LOW-30 | Low | CLAUDE.md double-parse error | Fixed |

---

## Remaining Issues from v1 (7)

### MEDIUM-5 -- Pydantic models defined but never used in route signatures

**File:** `backend/main.py:18-38`

`BoardColumn`, `BoardCard`, `BoardData`, and `AIStructuredResponse` are defined as Pydantic models but none are wired into route signatures. `BoardUpdateRequest` is used (accepting `Any`), and `ChatRequest` is used (accepting `question`), but the structured models serve no purpose.

The `BoardUpdateRequest.board` field typed as `Any` bypasses all validation that Pydantic could provide. Consider either using `BoardData` directly or removing the unused models.

### LOW-7 -- Unauthenticated arbitrary-prompt endpoint

**File:** `backend/main.py:55-62`

`POST /api/ai/test?prompt=<anything>` forwards arbitrary user-controlled text to the LLM with no authentication and no rate limiting. It consumes API key budget without restriction. This endpoint served scaffolding purposes and should be removed or gated behind auth before any non-local deployment.

### LOW-19b -- Redundant useMemo in ChatSidebar

**File:** `frontend/src/components/ChatSidebar.tsx:20`

```typescript
const hasMessages = useMemo(() => messages.length > 0, [messages.length]);
```

This is a trivial boolean comparison. `useMemo` adds overhead without preventing any meaningful recalculation. Replace with `const hasMessages = messages.length > 0`.

### LOW-20 -- No CORS middleware

**File:** `backend/main.py`

Running `npm run dev` (port 3000) alongside `uvicorn` (port 8000) causes all API calls to fail with CORS errors. No `CORSMiddleware` is configured and there is no Next.js dev proxy in `next.config.ts`.

### LOW-22 -- E2E drag test does not actually drag

**File:** `frontend/tests/kanban.spec.ts:43-61`

The test titled "moves a card between columns" adds a card and asserts it remains visible in the same column. No drag gesture is attempted. Drag-and-drop behaviour is never e2e tested.

### LOW-23 -- ChatSidebar tests do not cover error paths

**File:** `frontend/src/components/ChatSidebar.test.tsx`

No test covers: a rejected `sendChatMessage` promise, the disabled state during sending, or the error message bubble shown on failure.

### LOW-25 -- No coverage thresholds configured

**File:** `frontend/vitest.config.ts`

`coverage.reporter` is set but `coverage.thresholds` is absent. Coverage can drop to 0% without any CI gate failing.

---

## New Findings (2)

### LOW-31 -- Duplicate `import json` inside test function bodies

**File:** `backend/test_main.py:24, 36`

`json` is already imported at module level (`test_main.py:1`). There are redundant `import json` statements inside `test_get_board` (line 24) and `test_update_board` (line 36). While harmless, these clutter the code and shadow the module-level import.

### LOW-32 -- Placeholder AGENTS.md files lack content

**Files:** `backend/AGENTS.md`, `scripts/AGENTS.md`

Both files contain only a placeholder comment (`"This file should be updated with a description of the Backend"`). These should either be populated with meaningful documentation or removed.

---

## Observations (Non-Issues Worth Noting)

1. **Frontend/backend seed data mismatch.** `frontend/src/lib/kanban.ts:18-72` defines 8 cards across 5 columns, while `backend/models.py:68-84` seeds 6 cards. The initialData is only used as a fallback before the API loads, so this causes no runtime issue, but it is confusing for developers reading the code.

2. **ChatSidebar has no visible loading spinner.** During AI requests (which can take 5-30 seconds), the only feedback is the button text changing to "Sending...". Users see no progress indicator. Consider adding a spinner or pulse animation while `sending` is true.

3. **CLAUDE.md incorrectly documents the Docker run command** (line 35) without the `-v` volume mount flag and without `-e OPENROUTER_API_KEY`. These are required for persistence and AI functionality.

4. **`start.bat` (Windows) lacks volume mount and API key.** Unlike `start.sh`, the Windows batch script does not mount a volume for database persistence and does not pass the API key. Data will be lost on container restart.

5. **`load_dotenv()` in `main.py:13` looks for `.env` in the working directory.** In Docker, there is no `.env` file. This call is harmless (it returns silently if the file doesn't exist) but misleading. Consider guarding it or removing it since Docker relies on environment variables passed at runtime.

---

## Prioritised Action List

### Sprint 1 -- Correctness & Security

| # | Severity | Action | File |
|---|----------|--------|------|
| 1 | MEDIUM | Remove unused Pydantic models or wire them into route signatures | `backend/main.py:18-38` |
| 2 | LOW | Remove or auth-gate `POST /api/ai/test` | `backend/main.py:55-62` |
| 3 | LOW | Add CORS middleware for non-Docker dev | `backend/main.py` |

### Sprint 2 -- Test Coverage

| # | Severity | Action | File |
|---|----------|--------|------|
| 4 | LOW | Replace fake "moves a card" e2e test with real Playwright drag | `frontend/tests/kanban.spec.ts:43-61` |
| 5 | LOW | Add ChatSidebar tests for error state and sending state | `frontend/src/components/ChatSidebar.test.tsx` |
| 6 | LOW | Add coverage thresholds to vitest config | `frontend/vitest.config.ts` |

### Sprint 3 -- Polish

| # | Severity | Action | File |
|---|----------|--------|------|
| 7 | LOW | Remove redundant `useMemo` for `hasMessages` | `frontend/src/components/ChatSidebar.tsx:20` |
| 8 | LOW | Remove duplicate `import json` in test functions | `backend/test_main.py:24, 36` |
| 9 | LOW | Fill or remove placeholder AGENTS.md files | `backend/AGENTS.md`, `scripts/AGENTS.md` |
| 10 | LOW | Fix CLAUDE.md Docker run command (missing volume + API key) | `CLAUDE.md:35` |
| 11 | LOW | Fix `start.bat` to include volume mount and API key | `scripts/start.bat` |
| 12 | LOW | Guard or comment `load_dotenv()` for Docker context | `backend/main.py:13` |

---

## Conclusion

The project is in a healthy state for an MVP. The most serious issues from the v1 review have been resolved, and the remaining open items are low-severity polish issues. The code is readable, the architecture is coherent, and the test suite provides reasonable coverage for the current scope.

The most impactful remaining fix would be adding CORS middleware (to enable fast frontend dev without Docker) and filling the test coverage gaps in ChatSidebar and e2e drag testing.
