# Detailed Project Plan

## Part 1: Planning and Documentation
- [x] Create AGENTS.md in frontend/ describing existing code
- [x] Enrich PLAN.md with detailed substeps, checklists, tests, and success criteria for all parts
- [ ] Get user approval on the detailed plan

**Tests:** Manual review of documentation files.

**Success Criteria:** AGENTS.md exists with accurate frontend code description; PLAN.md contains detailed checklists for all 10 parts; user confirms approval.

## Part 2: Docker and Backend Scaffolding
- [x] Create Dockerfile for the project
- [x] Set up backend/ directory with FastAPI app
- [x] Install uv package manager in Docker
- [x] Create basic FastAPI routes: GET / (serve static HTML), GET /api/hello
- [x] Create scripts/start.sh and scripts/stop.sh for Mac, PC, Linux
- [x] Test Docker build and run locally
- [x] Verify API call works (curl localhost:8000/api/hello returns JSON)

**Tests:** Unit test for FastAPI routes; integration test for Docker container startup.

**Success Criteria:** Docker container builds successfully; app runs on localhost:8000; / serves HTML; /api/hello returns valid JSON response.

## Part 3: Static Frontend Serving
- [x] Configure NextJS for static export (output: 'export' in next.config.ts)
- [x] Update Dockerfile to build frontend and copy static files to backend
- [x] Modify FastAPI to serve static files from / (index.html, _next/)
- [x] Test that Kanban board loads at /
- [x] Run frontend unit and e2e tests in CI/CD

**Tests:** Existing frontend tests pass (6 unit + 3 e2e); integration verified via Docker logs (assets 200 OK).

**Success Criteria:** Frontend builds to static files; Kanban board displays correctly at /; all existing tests pass.

## Part 4: Fake User Authentication
- [x] Create login page component with username/password fields
- [x] Add client-side auth state management (localStorage for session)
- [x] Implement login logic with hardcoded "user"/"password"
- [x] Protect Kanban board route (redirect to login if not authenticated)
- [x] Add logout functionality
- [x] Update UI to show login/logout state

**Tests:** Unit tests for auth logic (6 e2e tests including login/logout); e2e tests for login flow, logout, protected routes.

**Success Criteria:** Login required to access Kanban; valid credentials work; invalid fail; logout clears session; UI updates accordingly.

## Part 5: Database Schema Design
- [ ] Design SQLite schema for users and kanban boards
- [ ] Define tables: users (id, username), boards (id, user_id, data JSON)
- [ ] Create docs/DATABASE.md with schema diagram and rationale
- [ ] Propose initial data migration
- [ ] Get user sign-off on schema

**Tests:** N/A (design document).

**Success Criteria:** DATABASE.md exists with clear schema; user approves design.

## Part 6: Backend API for Kanban
- [ ] Set up SQLAlchemy with SQLite database
- [ ] Create database models for User and Board
- [ ] Implement API routes: GET /api/board (get user's board), PUT /api/board (update board)
- [ ] Add database initialization on startup
- [ ] Handle user authentication in API (session-based)
- [ ] Write comprehensive backend unit tests

**Tests:** Unit tests for all API endpoints, database operations, auth middleware.

**Success Criteria:** API returns correct board data for authenticated user; updates persist to database; invalid auth returns 401; all tests pass.

## Part 7: Frontend-Backend Integration
- [ ] Replace local state in KanbanBoard with API calls
- [ ] Add fetch functions for getting/updating board
- [ ] Implement optimistic updates for drag operations
- [ ] Handle API errors gracefully (retry, user feedback)
- [ ] Update tests to mock API calls
- [ ] Run full e2e tests with backend

**Tests:** Unit tests with mocked API; integration tests with real backend; e2e tests.

**Success Criteria:** Kanban board loads from database; changes persist; drag operations work with backend; error handling works; all tests pass.

## Part 8: AI Connectivity Setup
- [ ] Install OpenRouter SDK in backend
- [ ] Create AI service module with OpenRouter client
- [ ] Implement simple test endpoint: POST /api/ai/test (send "2+2" and expect "4")
- [ ] Configure OPENROUTER_API_KEY from .env
- [ ] Test connectivity with real API call

**Tests:** Unit test for AI service; integration test for API connectivity.

**Success Criteria:** AI test endpoint works; returns correct response from openai/gpt-oss-120b:free; no API key errors.

## Part 9: AI Kanban Integration
- [ ] Extend AI service to accept kanban JSON + user question + history
- [ ] Define Structured Output schema: { response: string, kanbanUpdate?: BoardData }
- [ ] Create API endpoint: POST /api/ai/chat
- [ ] Implement conversation history storage
- [ ] Parse AI response and apply kanban updates if present
- [ ] Add backend validation for updates

**Tests:** Unit tests for AI parsing; integration tests for full chat flow; mock AI responses.

**Success Criteria:** AI responds to questions; can update kanban via structured output; history maintained; invalid updates rejected.

## Part 10: AI Chat UI
- [ ] Create ChatSidebar component with message history
- [ ] Add chat input and send functionality
- [ ] Integrate with /api/ai/chat endpoint
- [ ] Auto-refresh kanban when AI updates it
- [ ] Style sidebar to match design system
- [ ] Add toggle to show/hide sidebar

**Tests:** Unit tests for chat component; e2e tests for full chat interaction.

**Success Criteria:** Sidebar displays chat history; sending messages works; kanban updates automatically; UI matches design; all tests pass.