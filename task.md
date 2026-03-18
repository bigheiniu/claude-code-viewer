# Task: Multi-Session Manager & Tabbed Canvas for Claude Code Viewer

## Overview

Extend [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) with a **project-grouped sidebar**, **multi-session selection**, and a **tabbed grid canvas** — enabling users to organize, compare, and manage multiple Claude Code sessions simultaneously across projects.

Claude Code Viewer currently provides a single-session chat view. This feature adds a higher-level orchestration layer: a session manager where users can see all their projects (grouped by folder path from `~/.claude/projects/`), select multiple sessions, compose them into named tabs, and view them side-by-side in a grid layout.

---

## Motivation

When working across multiple repositories or within a monorepo, developers often run many Claude Code sessions in parallel — one for auth refactoring, another for CI/CD, another for tests. The current single-session view makes it difficult to:

- Get a birds-eye view of all active work across projects
- Compare progress between related sessions
- Group sessions by concern (e.g. "Backend", "DevOps", "Frontend") rather than by project folder
- Quickly switch context between session groups

This feature solves these problems by introducing a **session manager view** as a new top-level route/mode in CCV.

---

## UI Reference Prototype
A working React prototype is provided as [claude-code-sessions.jsx](claude-code-sessions.jsx). This file serves as the visual and interaction reference for the implementation. It demonstrates:
Project-grouped sidebar: 5 sample projects with collapsible session lists, tri-state select-all checkboxes, color-coded project indicators, search filtering, and "Select All" / "Clear" footer actions
Tabbed canvas: browser-style tab bar with add/close/switch, inline tab creation input, and session count badges
Session grid: responsive auto-fill card layout with project color stripes, status dots, language tags, file tree previews, conversation history previews, metadata rows, and staggered mount animations
Interactions: session checkbox toggle, hover "Add to Tab" button, per-card remove from tab, aggregate stats in canvas header


Note: The prototype uses hardcoded mock data and inline styles. When integrating into CCV, replace mock data with real API calls, convert inline styles to CCV's CSS variable / Tailwind / shadcn system, and split the monolithic file into the component structure outlined in the File Structure section below. The prototype is a design spec, not production code — use it as a pixel-reference for layout, spacing, interactions, and component hierarchy.

---

## Architecture & Integration Points


### Data Source

CCV reads session logs from `~/.claude/projects/<project>/<session-id>.jsonl`. The existing API already exposes:

- `GET /api/projects` — lists all projects (folder paths)
- `GET /api/projects/:project/sessions` — lists sessions within a project
- SSE endpoints for real-time session updates

The session manager UI will consume these existing endpoints. No new backend APIs are required for the initial implementation, though some may be added for persisting tab configurations.

### Tech Stack Alignment

CCV uses:

- **TypeScript** (strict) with **React** (Vite)
- **Biome** for linting/formatting
- **pnpm** as package manager
- **shadcn/ui** component library
- **Lingui** for i18n (en, ja, zh-CN)
- **Zod** for schema validation
- **Vitest** for unit tests, **Playwright** for e2e

All new code must follow these conventions. Refer to `CLAUDE.md` and `AGENTS.md` in the repo root for project-specific coding standards.

### File Structure (Proposed)

```
src/
├── features/
│   └── session-manager/
│       ├── components/
│       │   ├── SessionManagerView.tsx      # Top-level layout (sidebar + canvas)
│       │   ├── ProjectSidebar.tsx          # Left panel: project tree with sessions
│       │   ├── ProjectGroup.tsx            # Collapsible project with nested sessions
│       │   ├── SessionItem.tsx             # Individual session row in sidebar
│       │   ├── TabBar.tsx                  # Browser-style tab bar
│       │   ├── SessionGrid.tsx             # Right panel: grid of session cards
│       │   ├── SessionCard.tsx             # Individual card in the grid
│       │   └── NewTabDialog.tsx            # Dialog for creating/naming tabs
│       ├── hooks/
│       │   ├── useProjects.ts              # Fetch & cache project list
│       │   ├── useSessions.ts              # Fetch sessions for a project
│       │   ├── useSessionManager.ts        # Selection, tabs, and grid state
│       │   └── useTabPersistence.ts        # Save/load tab configs to localStorage
│       ├── types.ts                        # Types for the session manager domain
│       ├── utils.ts                        # Grouping, filtering, sorting helpers
│       └── index.ts                        # Public exports

# Reference prototype (not checked in — design spec only):
#   claude-code-sessions.jsx              # Working React prototype with mock data
```

---

## Feature Specification

### 1. Project-Grouped Sidebar (Left Panel)

**Goal**: Display all Claude Code projects as collapsible tree nodes, with sessions nested under each project.

#### Data Mapping

```
~/.claude/projects/
├── -Users-alice-dev-acme-web-app/     →  Project: "acme-web-app"  (~/dev/acme-web-app)
│   ├── abc123.jsonl                   →    Session: "auth-refactor" (from title)
│   ├── def456.jsonl                   →    Session: "api-endpoints"
│   └── ghi789.jsonl                   →    Session: "ui-dashboard"
├── -Users-alice-dev-infra-platform/   →  Project: "infra-platform" (~/dev/infra-platform)
│   ├── jkl012.jsonl                   →    Session: "ci-pipeline"
│   └── mno345.jsonl                   →    Session: "terraform-aws"
```

CCV already converts the encoded folder names back to readable paths. Reuse that logic.

#### UI Behavior

- Each project shows: **name** (last path segment), **full path** (monospace, dimmed), **color indicator** (auto-assigned or hashed from path), **session count badge**
- Click project header to **expand/collapse** session list
- Each project has a **select-all checkbox** with tri-state: unchecked / partial (dash) / all checked
- Search bar filters both project names and session names/descriptions
- Footer has "Select All" / "Clear" buttons

#### Session Row (within project)

- Shows: **session title** (from JSONL first user message or metadata), **status indicator** (active / idle / done), **language/tool tags**, **file count**, **token usage**, **last active time**
- Checkbox for individual selection
- Hover reveals a **"+ Tab"** button to add to the currently active tab
- Small dot indicator if session is already in the active tab

### 2. Tabbed Canvas (Right Panel)

**Goal**: A browser-style tab bar where each tab represents a curated combination of sessions displayed in a responsive grid.

#### Tab Bar

- Tabs show: **name**, **session count**, **close button (×)**
- Active tab has an accent underline
- **"+"** button at the end opens a dialog to create a new tab from the current sidebar selection
- Tab creation: user provides a name, selected sessions are auto-populated
- Tabs can be closed (with confirmation if > 3 sessions)
- Tab order is fixed (no drag reorder in v1)

#### Session Grid (within active tab)

- Responsive CSS grid: `repeat(auto-fill, minmax(280px, 1fr))`
- Each card displays:
  - **Colored top stripe** matching the parent project color
  - **Session name** + status dot
  - **Description** (first user message, truncated)
  - **Project path** (dimmed monospace)
  - **Metadata row**: language tag, file count, token count, last active time
  - **File tree preview**: top 3 files from the session's tool-use history
  - **Last exchange preview**: most recent user + assistant message (truncated)
  - **Remove button (×)**: removes session from this tab (not from the project)
- Empty state when no sessions: hex icon + instruction text
- Header shows: tab name, session count, aggregate file count, aggregate token count

#### Card Interactions
- Each card is a existing CCV session. 
- Click a card → Resume that session, and allow user to type in query. You can reuse the CCV session interaction. **This is most important feature I want** 
- Also provide button to choose switch between --dangerously-skip-permissions or not. 
- Remove button → removes from current tab only
- Cards animate in with staggered fade-up on tab switch

### 3. State Management

#### Selection State

```typescript
interface SessionManagerState {
  // Sidebar
  expandedProjects: Set<string>;       // project IDs currently expanded
  selectedSessions: Set<string>;       // session IDs currently checked
  searchQuery: string;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;
}

interface Tab {
  id: string;
  name: string;
  sessionIds: string[];                // ordered list of session IDs
  createdAt: number;
}
```

#### Persistence

- Tab configurations persist to `localStorage` under key `ccv-session-manager-tabs`
- Expanded/collapsed project state persists to `localStorage`
- Selection state is ephemeral (resets on page load)

### 4. Integration with Existing CCV Features

| CCV Feature | Integration |
|---|---|
| **Session detail view** | Card click navigates to `/projects/:project/sessions/:id` |
| **Real-time SSE** | Session status (active/idle/done) updates live in both sidebar and grid cards |
| **Search (⌘K)** | Extend global search to include session manager results |
| **Resume/Continue** | Add context menu on cards: "Resume Session", "Continue Session" |
| **Git Diff Viewer** | Add context menu on cards: "Review Changes" |
| **i18n** | All strings must use Lingui `t` macro / `Trans` component |
| **Theme** | Must respect CCV's dark/light theme toggle via CSS variables |
| **Mobile** | Sidebar collapses to drawer on mobile; grid switches to single-column |

---

## Implementation Plan

### Phase 1: Core Layout & Data Wiring

> Use `claude-code-sessions.jsx` as the visual reference throughout all phases. Match its layout proportions, spacing, color mapping, and interaction patterns — adapting from inline styles to CCV's design system.

- [ ] Create `SessionManagerView` with sidebar + canvas split layout
- [ ] Implement `useProjects` hook consuming `GET /api/projects`
- [ ] Implement `useSessions` hook consuming session list endpoint
- [ ] Build `ProjectSidebar` with collapsible `ProjectGroup` components
- [ ] Build `SessionItem` with selection checkbox
- [ ] Wire up search filtering across projects and sessions

### Phase 2: Tab System & Grid

- [ ] Implement `TabBar` component with add/close/switch functionality
- [ ] Implement `SessionGrid` with responsive card layout
- [ ] Build `SessionCard` with metadata, file preview, and conversation preview
- [ ] Implement `useSessionManager` hook for centralized state
- [ ] Add `useTabPersistence` for localStorage save/load
- [ ] Wire "Add to Tab" action from sidebar hover

### Phase 3: Live Data & Navigation

- [ ] Connect SSE for real-time session status updates
- [ ] Implement card click → session detail navigation
- [ ] Add context menu (right-click / long-press) for Resume, Continue, Review
- [ ] Add animated mount transitions for cards and sidebar items
- [ ] Implement empty states for tabs with no sessions

### Phase 4: Polish & Integration

- [ ] Add i18n strings for en, ja, zh-CN
- [ ] Theme support: verify rendering in both dark and light modes
- [ ] Mobile responsive: sidebar drawer, single-column grid
- [ ] Extend `⌘K` search to include session manager context
- [ ] Add route `/session-manager` (or integrate as a mode toggle in existing sidebar)
- [ ] Write unit tests for hooks and utility functions
- [ ] Write e2e tests with Playwright snapshots

### Phase 5 (Future): Advanced Features

- [ ] Drag-and-drop tab reordering
- [ ] Drag sessions between tabs
- [ ] Tab templates (auto-group by: language, status, project, recency)
- [ ] Session comparison view (diff two sessions' outputs)
- [ ] Bulk actions: resume all, compact all, export all in tab
- [ ] Server-side tab persistence (for multi-device sync)
- [ ] Session tagging / custom labels beyond project grouping

---

## API Considerations

### Existing Endpoints (No Changes Needed)

- `GET /api/projects` — Returns project list with metadata
- `GET /api/projects/:project/sessions` — Returns sessions with titles, status
- `GET /api/sse` — Real-time updates for session state changes

### New Endpoints (Phase 5, Optional)

```
POST   /api/session-manager/tabs          # Create a tab config
GET    /api/session-manager/tabs          # List all tab configs
PUT    /api/session-manager/tabs/:id      # Update tab
DELETE /api/session-manager/tabs/:id      # Delete tab
```

These would enable server-side persistence for multi-device sync and team sharing.

---

## Design Tokens

Use CCV's existing CSS variable system. Key variables to leverage:

```css
/* Map to CCV's theme system */
--background          /* Main background */
--foreground          /* Primary text */
--muted               /* Dimmed backgrounds */
--muted-foreground    /* Secondary text */
--accent              /* Highlight color */
--accent-foreground   /* Text on accent */
--border              /* Borders and dividers */
--card                /* Card backgrounds */
--card-foreground     /* Card text */
```

Project colors should be deterministically generated from the project path hash to ensure consistency across sessions.

---

## Testing Strategy

### Unit Tests (Vitest)

- `useSessionManager` hook: selection, tab CRUD, add/remove from tab
- `useTabPersistence`: localStorage read/write/migration
- Utility functions: project grouping, search filtering, color hashing
- Component snapshots for key states (empty, populated, search active)

### E2E Tests (Playwright)

- Navigate to session manager view
- Expand a project, select sessions
- Create a new tab, verify grid populates
- Switch tabs, verify grid updates
- Remove a session from tab, verify card disappears
- Search filters both projects and sessions
- Mobile viewport: sidebar opens as drawer

---

## Acceptance Criteria

1. User can see all projects grouped by folder path in the left sidebar
2. User can expand/collapse projects to reveal nested sessions
3. User can select/deselect individual sessions and entire projects
4. User can create named tabs that contain a custom combination of sessions
5. Switching tabs updates the right-panel grid to show only that tab's sessions
6. Session cards display meaningful metadata: title, status, language, files, tokens, last activity
7. Clicking a session card navigates to the existing session detail/chat view
8. Tab configurations persist across page reloads (localStorage)
9. Real-time status updates reflect in both sidebar and grid cards
10. UI works in both dark and light themes
11. UI is responsive on mobile (sidebar as drawer, single-column grid)
12. All user-facing strings are internationalized (en, ja, zh-CN)