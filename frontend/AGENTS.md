# Frontend Code Description

## Overview
The frontend is a NextJS application built with TypeScript, React 19, and TailwindCSS. It implements a single-board Kanban interface with drag-and-drop functionality using @dnd-kit. The app is designed as a demo with local state management and no backend integration yet.

## Architecture
- **Framework**: NextJS 16 with App Router
- **Styling**: TailwindCSS with custom CSS variables for the specified color scheme
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Fonts**: Space Grotesk (display), Manrope (body)
- **Testing**: Vitest for unit tests, Playwright for e2e tests

## Key Components

### KanbanBoard
- Main component rendered on the home page
- Manages board state (columns and cards) using React useState
- Handles drag start/end events for card movement
- Provides handlers for renaming columns, adding/deleting cards
- Renders header with board title and column badges
- Uses DndContext for drag operations with DragOverlay for previews

### KanbanColumn
- Represents each column in the board
- Uses @dnd-kit's useDroppable for drop zones
- Displays column title (editable input), card count, and accent bar
- Contains SortableContext for card ordering within column
- Includes NewCardForm at the bottom
- Shows "Drop a card here" placeholder when empty

### KanbanCard
- Individual card component using @dnd-kit's useSortable
- Displays card title and details
- Has delete button
- Applies drag styles and transitions

### KanbanCardPreview
- Simplified card component for drag overlay
- Shows title and details without delete button

### NewCardForm
- Form for adding new cards to a column
- Toggles between collapsed "Add a card" button and expanded form
- Validates title is required
- Resets form on submit or cancel

## Data Structure
Located in `src/lib/kanban.ts`:

- **Card**: { id, title, details }
- **Column**: { id, title, cardIds[] }
- **BoardData**: { columns[], cards: Record<string, Card> }

## Key Functions
- `initialData`: Provides sample board with 5 columns and 8 cards
- `moveCard`: Handles all card movement logic (within column, between columns, to empty columns)
- `createId`: Generates unique IDs with prefix

## State Management
- Board state stored in KanbanBoard component
- No global state management (Redux, Zustand, etc.)
- All operations are synchronous and local

## Testing
- **Unit tests**: Logic in kanban.test.ts, component interactions in KanbanBoard.test.tsx
- **E2E tests**: Full user flows in tests/kanban.spec.ts using Playwright
- Tests cover rendering, renaming, adding/removing cards, drag operations

## Styling
- Uses CSS custom properties for colors matching the design system
- Responsive design with Tailwind classes
- Glassmorphism effects with backdrop-blur and transparency
- Custom shadows and gradients for visual depth

## Current Limitations
- No persistence (data resets on refresh)
- No user authentication
- No backend integration
- No AI chat feature
- Fixed 5-column layout