# Multi-Session Manager & Tabbed Canvas Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session manager view with project-grouped sidebar, multi-session selection, tabbed grid canvas, and card-click-to-resume functionality.

**Architecture:** New route `/session-manager` with a split-panel layout (left sidebar + right canvas). The sidebar fetches all projects via existing `projectListQuery` and each project's sessions via `projectDetailQuery`. Sessions are displayed in a responsive grid organized into user-created tabs. Clicking a card opens an inline session detail view with chat input for resuming. State is managed via React state + localStorage persistence for tabs.

**Tech Stack:** React 19, TanStack Router, TanStack Query, shadcn/ui, Tailwind CSS, Lingui i18n, Zod, Vitest.

**Reference prototype:** `claude-code-sessions.jsx` (pixel reference for layout, spacing, interactions).

---

## File Structure

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
│       │   ├── SessionDetailPanel.tsx      # Inline session detail + chat input
│       │   └── CanvasHeader.tsx            # Tab name + aggregate stats
│       ├── hooks/
│       │   ├── useAllProjectSessions.ts    # Fetch all projects + their sessions
│       │   ├── useSessionManager.ts        # Selection, tabs, grid state
│       │   └── useTabPersistence.ts        # Save/load tab configs to localStorage
│       ├── types.ts                        # Types for the session manager domain
│       ├── utils.ts                        # Color hashing, filtering, sorting
│       └── index.ts                        # Public exports
├── routes/
│   └── session-manager.tsx                 # TanStack Router route definition
```

---

## Task 1: Types and Utilities

**Files:**
- Create: `src/features/session-manager/types.ts`
- Create: `src/features/session-manager/utils.ts`
- Test: `src/features/session-manager/utils.test.ts`

- [ ] **Step 1: Write failing tests for utility functions**

```typescript
// src/features/session-manager/utils.test.ts
import { describe, expect, test } from "vitest";
import { getProjectColor, filterProjects, getProjectDisplayName } from "./utils";

describe("getProjectColor", () => {
  test("returns consistent color for the same path", () => {
    const color1 = getProjectColor("/Users/alice/dev/acme");
    const color2 = getProjectColor("/Users/alice/dev/acme");
    expect(color1).toBe(color2);
  });

  test("returns different colors for different paths", () => {
    const color1 = getProjectColor("/Users/alice/dev/acme");
    const color2 = getProjectColor("/Users/alice/dev/other");
    expect(color1).not.toBe(color2);
  });

  test("returns a valid hex color", () => {
    const color = getProjectColor("/some/path");
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("getProjectDisplayName", () => {
  test("extracts last path segment from encoded project path", () => {
    expect(getProjectDisplayName("-Users-alice-dev-acme-web-app")).toBe("acme-web-app");
  });

  test("handles single segment", () => {
    expect(getProjectDisplayName("my-project")).toBe("my-project");
  });
});

describe("filterProjects", () => {
  const projects = [
    {
      id: "p1",
      name: "acme-web-app",
      path: "~/dev/acme-web-app",
      sessions: [
        { id: "s1", title: "auth refactor", sessionId: "s1" },
        { id: "s2", title: "api endpoints", sessionId: "s2" },
      ],
    },
    {
      id: "p2",
      name: "infra-platform",
      path: "~/dev/infra-platform",
      sessions: [
        { id: "s3", title: "ci pipeline", sessionId: "s3" },
      ],
    },
  ];

  test("returns all projects when query is empty", () => {
    const result = filterProjects(projects, "");
    expect(result).toHaveLength(2);
  });

  test("filters by project name", () => {
    const result = filterProjects(projects, "acme");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("acme-web-app");
  });

  test("filters by session title", () => {
    const result = filterProjects(projects, "pipeline");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("infra-platform");
  });

  test("is case insensitive", () => {
    const result = filterProjects(projects, "ACME");
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/session-manager/utils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create types.ts**

```typescript
// src/features/session-manager/types.ts
export interface SessionManagerTab {
  id: string;
  name: string;
  sessionIds: string[]; // Format: "projectId::sessionId"
  createdAt: number;
}

export interface SessionManagerState {
  expandedProjects: Set<string>;
  selectedSessions: Set<string>; // Format: "projectId::sessionId"
  searchQuery: string;
  tabs: SessionManagerTab[];
  activeTabId: string | null;
}

export interface ProjectWithSessions {
  id: string;
  name: string;
  path: string;
  color: string;
  sessions: ProjectSession[];
}

export interface ProjectSession {
  sessionId: string;
  compositeId: string; // "projectId::sessionId"
  projectId: string;
  title: string;
  messageCount: number;
  lastModifiedAt: string | null;
  firstUserMessage: string | null;
  status?: "running" | "paused";
}
```

- [ ] **Step 4: Implement utils.ts**

```typescript
// src/features/session-manager/utils.ts
import type { ProjectWithSessions } from "./types";

const PROJECT_COLORS = [
  "#d4a574", "#34d399", "#818cf8", "#f472b6", "#fbbf24",
  "#fb923c", "#a78bfa", "#38bdf8", "#f87171", "#4ade80",
  "#e879f9", "#22d3ee", "#facc15", "#c084fc", "#2dd4bf",
];

export function getProjectColor(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash + path.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PROJECT_COLORS.length;
  const color = PROJECT_COLORS[index];
  if (color === undefined) {
    return "#818cf8";
  }
  return color;
}

export function getProjectDisplayName(encodedPath: string): string {
  const segments = encodedPath.split("-").filter(Boolean);
  // The encoded path is like "-Users-alice-dev-acme-web-app"
  // We want the last meaningful segment(s) that form the project name
  // Use the meta.projectName from API when available; this is a fallback
  const decoded = encodedPath.replace(/^-/, "").replaceAll("-", "/");
  const lastSegment = decoded.split("/").pop();
  return lastSegment ?? encodedPath;
}

interface FilterableProject {
  id: string;
  name: string;
  path: string;
  sessions: Array<{ id: string; title: string; sessionId: string }>;
}

export function filterProjects<T extends FilterableProject>(
  projects: T[],
  query: string,
): T[] {
  if (!query.trim()) return projects;
  const lowerQuery = query.toLowerCase();

  return projects
    .map((project) => {
      const projectMatches = project.name.toLowerCase().includes(lowerQuery) ||
        project.path.toLowerCase().includes(lowerQuery);

      if (projectMatches) return project;

      const filteredSessions = project.sessions.filter(
        (s) => s.title.toLowerCase().includes(lowerQuery),
      );

      if (filteredSessions.length === 0) return null;

      return { ...project, sessions: filteredSessions };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

export function makeCompositeId(projectId: string, sessionId: string): string {
  return `${projectId}::${sessionId}`;
}

export function parseCompositeId(compositeId: string): { projectId: string; sessionId: string } {
  const [projectId, sessionId] = compositeId.split("::");
  return { projectId: projectId ?? "", sessionId: sessionId ?? "" };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/features/session-manager/utils.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/session-manager/types.ts src/features/session-manager/utils.ts src/features/session-manager/utils.test.ts
git commit -m "feat: add session manager types and utility functions"
```

---

## Task 2: useTabPersistence Hook

**Files:**
- Create: `src/features/session-manager/hooks/useTabPersistence.ts`
- Test: `src/features/session-manager/hooks/useTabPersistence.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/features/session-manager/hooks/useTabPersistence.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, test, beforeEach } from "vitest";
import { useTabPersistence } from "./useTabPersistence";
import type { SessionManagerTab } from "../types";

beforeEach(() => {
  localStorage.clear();
});

describe("useTabPersistence", () => {
  test("returns empty tabs initially", () => {
    const { result } = renderHook(() => useTabPersistence());
    expect(result.current.tabs).toEqual([]);
  });

  test("saves and loads tabs from localStorage", () => {
    const tabs: SessionManagerTab[] = [
      { id: "t1", name: "Backend", sessionIds: ["p1::s1"], createdAt: 1000 },
    ];

    const { result } = renderHook(() => useTabPersistence());
    act(() => {
      result.current.setTabs(tabs);
    });

    expect(result.current.tabs).toEqual(tabs);

    // Re-render to simulate page reload
    const { result: result2 } = renderHook(() => useTabPersistence());
    expect(result2.current.tabs).toEqual(tabs);
  });

  test("saves and loads activeTabId", () => {
    const { result } = renderHook(() => useTabPersistence());
    act(() => {
      result.current.setActiveTabId("t1");
    });
    expect(result.current.activeTabId).toBe("t1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/session-manager/hooks/useTabPersistence.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useTabPersistence**

```typescript
// src/features/session-manager/hooks/useTabPersistence.ts
import { useCallback, useState } from "react";
import type { SessionManagerTab } from "../types";

const TABS_KEY = "ccv-session-manager-tabs";
const ACTIVE_TAB_KEY = "ccv-session-manager-active-tab";
const EXPANDED_KEY = "ccv-session-manager-expanded";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useTabPersistence() {
  const [tabs, setTabsState] = useState<SessionManagerTab[]>(() =>
    loadFromStorage<SessionManagerTab[]>(TABS_KEY, []),
  );
  const [activeTabId, setActiveTabIdState] = useState<string | null>(() =>
    loadFromStorage<string | null>(ACTIVE_TAB_KEY, null),
  );
  const [expandedProjects, setExpandedProjectsState] = useState<string[]>(() =>
    loadFromStorage<string[]>(EXPANDED_KEY, []),
  );

  const setTabs = useCallback((newTabs: SessionManagerTab[]) => {
    setTabsState(newTabs);
    saveToStorage(TABS_KEY, newTabs);
  }, []);

  const setActiveTabId = useCallback((id: string | null) => {
    setActiveTabIdState(id);
    saveToStorage(ACTIVE_TAB_KEY, id);
  }, []);

  const setExpandedProjects = useCallback((ids: string[]) => {
    setExpandedProjectsState(ids);
    saveToStorage(EXPANDED_KEY, ids);
  }, []);

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    expandedProjects,
    setExpandedProjects,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/session-manager/hooks/useTabPersistence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/session-manager/hooks/useTabPersistence.ts src/features/session-manager/hooks/useTabPersistence.test.ts
git commit -m "feat: add tab persistence hook with localStorage"
```

---

## Task 3: useSessionManager Hook

**Files:**
- Create: `src/features/session-manager/hooks/useSessionManager.ts`
- Test: `src/features/session-manager/hooks/useSessionManager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/features/session-manager/hooks/useSessionManager.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, test, beforeEach } from "vitest";
import { useSessionManager } from "./useSessionManager";

beforeEach(() => {
  localStorage.clear();
});

describe("useSessionManager", () => {
  test("initializes with empty state", () => {
    const { result } = renderHook(() => useSessionManager());
    expect(result.current.selectedSessions.size).toBe(0);
    expect(result.current.searchQuery).toBe("");
    expect(result.current.tabs).toEqual([]);
  });

  test("toggleSession adds and removes from selection", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => result.current.toggleSession("p1::s1"));
    expect(result.current.selectedSessions.has("p1::s1")).toBe(true);
    act(() => result.current.toggleSession("p1::s1"));
    expect(result.current.selectedSessions.has("p1::s1")).toBe(false);
  });

  test("createTab creates a tab from selected sessions", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.toggleSession("p1::s2");
    });
    act(() => {
      result.current.createTab("Backend");
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0]?.name).toBe("Backend");
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s1");
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s2");
    expect(result.current.activeTabId).toBe(result.current.tabs[0]?.id);
  });

  test("closeTab removes tab and switches active tab", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.createTab("Tab1");
    });
    const tabId = result.current.tabs[0]?.id;
    expect(tabId).toBeDefined();
    act(() => {
      if (tabId) result.current.closeTab(tabId);
    });
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeTabId).toBeNull();
  });

  test("addToTab adds session to active tab", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.createTab("Tab1");
    });
    act(() => {
      result.current.addToTab("p1::s2");
    });
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s2");
  });

  test("removeFromTab removes session from active tab", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.toggleSession("p1::s2");
      result.current.createTab("Tab1");
    });
    act(() => {
      result.current.removeFromTab("p1::s1");
    });
    expect(result.current.tabs[0]?.sessionIds).not.toContain("p1::s1");
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s2");
  });

  test("selectAllInProject toggles all sessions", () => {
    const { result } = renderHook(() => useSessionManager());
    const sessionIds = ["p1::s1", "p1::s2", "p1::s3"];
    act(() => {
      result.current.selectAllInProject(sessionIds);
    });
    expect(result.current.selectedSessions.size).toBe(3);
    // Toggle again to deselect all
    act(() => {
      result.current.selectAllInProject(sessionIds);
    });
    expect(result.current.selectedSessions.size).toBe(0);
  });

  test("clearSelection empties selection", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.toggleSession("p1::s2");
    });
    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedSessions.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/session-manager/hooks/useSessionManager.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useSessionManager**

```typescript
// src/features/session-manager/hooks/useSessionManager.ts
import { useCallback, useState } from "react";
import type { SessionManagerTab } from "../types";
import { useTabPersistence } from "./useTabPersistence";

export function useSessionManager() {
  const {
    tabs, setTabs,
    activeTabId, setActiveTabId,
    expandedProjects, setExpandedProjects,
  } = useTabPersistence();

  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSession = useCallback((compositeId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(compositeId)) {
        next.delete(compositeId);
      } else {
        next.add(compositeId);
      }
      return next;
    });
  }, []);

  const selectAllInProject = useCallback((sessionCompositeIds: string[]) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      const allSelected = sessionCompositeIds.every((id) => next.has(id));
      for (const id of sessionCompositeIds) {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allCompositeIds: string[]) => {
    setSelectedSessions(new Set(allCompositeIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessions(new Set());
  }, []);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects(
      expandedProjects.includes(projectId)
        ? expandedProjects.filter((id) => id !== projectId)
        : [...expandedProjects, projectId],
    );
  }, [expandedProjects, setExpandedProjects]);

  const createTab = useCallback((name: string) => {
    const newTab: SessionManagerTab = {
      id: `tab-${Date.now()}`,
      name,
      sessionIds: [...selectedSessions],
      createdAt: Date.now(),
    };
    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(newTab.id);
  }, [selectedSessions, tabs, setTabs, setActiveTabId]);

  const closeTab = useCallback((tabId: string) => {
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id ?? null);
    }
  }, [tabs, activeTabId, setTabs, setActiveTabId]);

  const addToTab = useCallback((compositeId: string) => {
    if (!activeTabId) return;
    setTabs(
      tabs.map((t) =>
        t.id === activeTabId && !t.sessionIds.includes(compositeId)
          ? { ...t, sessionIds: [...t.sessionIds, compositeId] }
          : t,
      ),
    );
  }, [activeTabId, tabs, setTabs]);

  const removeFromTab = useCallback((compositeId: string) => {
    if (!activeTabId) return;
    setTabs(
      tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, sessionIds: t.sessionIds.filter((id) => id !== compositeId) }
          : t,
      ),
    );
  }, [activeTabId, tabs, setTabs]);

  const currentTab = tabs.find((t) => t.id === activeTabId);

  return {
    // Sidebar state
    expandedProjects: new Set(expandedProjects),
    selectedSessions,
    searchQuery,
    setSearchQuery,

    // Sidebar actions
    toggleProject,
    toggleSession,
    selectAllInProject,
    selectAll,
    clearSelection,

    // Tab state
    tabs,
    activeTabId,
    currentTab,

    // Tab actions
    setActiveTabId,
    createTab,
    closeTab,
    addToTab,
    removeFromTab,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/session-manager/hooks/useSessionManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/session-manager/hooks/useSessionManager.ts src/features/session-manager/hooks/useSessionManager.test.ts
git commit -m "feat: add useSessionManager hook for selection and tab management"
```

---

## Task 4: useAllProjectSessions Data Hook

**Files:**
- Create: `src/features/session-manager/hooks/useAllProjectSessions.ts`

This hook fetches all projects and their sessions, transforming them into the `ProjectWithSessions[]` shape.

- [ ] **Step 1: Implement the hook**

```typescript
// src/features/session-manager/hooks/useAllProjectSessions.ts
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { projectDetailQuery, projectListQuery } from "@/lib/api/queries";
import { honoClient } from "@/lib/api/client";
import { sessionProcessesAtom } from "@/app/projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";
import { firstUserMessageToTitle } from "@/app/projects/[projectId]/services/firstCommandToTitle";
import type { ProjectWithSessions, ProjectSession } from "../types";
import { getProjectColor, makeCompositeId } from "../utils";

export function useAllProjectSessions(): ProjectWithSessions[] {
  const { data: projectList } = useSuspenseQuery({
    queryKey: projectListQuery.queryKey,
    queryFn: projectListQuery.queryFn,
  });

  const sessionProcesses = useAtomValue(sessionProcessesAtom);

  // For each project, fetch its sessions
  // We use individual queries so TanStack Query can cache them independently
  const projectsWithSessions = projectList.projects.map((project) => {
    const projectId = project.id;
    const projectName = project.meta.projectName ?? projectId;
    const projectPath = project.meta.projectPath ?? project.claudeProjectPath ?? "";
    const color = getProjectColor(projectPath);

    const sessions: ProjectSession[] = project.sessions?.map((session) => {
      const process = sessionProcesses.find((p) => p.sessionId === session.id);
      return {
        sessionId: session.id,
        compositeId: makeCompositeId(projectId, session.id),
        projectId,
        title: session.meta.firstUserMessage
          ? firstUserMessageToTitle(session.meta.firstUserMessage)
          : session.id,
        messageCount: session.meta.messageCount,
        lastModifiedAt: session.lastModifiedAt,
        firstUserMessage: session.meta.firstUserMessage,
        status: process?.status,
      };
    }) ?? [];

    return {
      id: projectId,
      name: projectName,
      path: projectPath,
      color,
      sessions,
    };
  });

  return projectsWithSessions;
}
```

Note: The exact shape of the project list API response needs verification at implementation time. The implementer should read `src/server/hono/routes/projectRoutes.ts` to confirm the response shape and adjust the field access accordingly. The `projectListQuery` may return projects with or without inline sessions — if sessions are not inline, the implementer should fetch each project's sessions separately using `projectDetailQuery`.

- [ ] **Step 2: Commit**

```bash
git add src/features/session-manager/hooks/useAllProjectSessions.ts
git commit -m "feat: add useAllProjectSessions data hook"
```

---

## Task 5: ProjectSidebar, ProjectGroup, SessionItem Components

**Files:**
- Create: `src/features/session-manager/components/ProjectSidebar.tsx`
- Create: `src/features/session-manager/components/ProjectGroup.tsx`
- Create: `src/features/session-manager/components/SessionItem.tsx`

- [ ] **Step 1: Implement SessionItem**

```tsx
// src/features/session-manager/components/SessionItem.tsx
import { Trans } from "@lingui/react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import type { ProjectSession } from "../types";

export const SessionItem: FC<{
  session: ProjectSession;
  projectColor: string;
  isSelected: boolean;
  isInActiveTab: boolean;
  hasActiveTab: boolean;
  onToggle: () => void;
  onAddToTab: () => void;
}> = ({
  session,
  projectColor,
  isSelected,
  isInActiveTab,
  hasActiveTab,
  onToggle,
  onAddToTab,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors",
        isSelected ? "bg-accent/50" : "hover:bg-accent/30",
      )}
      style={isSelected ? { borderLeft: `2px solid ${projectColor}` } : { borderLeft: "2px solid transparent" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onToggle}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate font-mono">
            {session.title}
          </span>
          {session.status === "running" && (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          )}
          {session.status === "paused" && (
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
          <span>{session.messageCount} msgs</span>
          {session.lastModifiedAt && (
            <span>{new Date(session.lastModifiedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      {isHovered && hasActiveTab && !isInActiveTab && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-5 px-1.5 text-[9px]"
          onClick={(e) => {
            e.stopPropagation();
            onAddToTab();
          }}
        >
          <PlusIcon className="h-3 w-3 mr-0.5" />
          Tab
        </Button>
      )}
      {isInActiveTab && (
        <span
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: projectColor }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Implement ProjectGroup**

```tsx
// src/features/session-manager/components/ProjectGroup.tsx
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRightIcon } from "lucide-react";
import type { FC } from "react";
import type { ProjectWithSessions } from "../types";
import { SessionItem } from "./SessionItem";

export const ProjectGroup: FC<{
  project: ProjectWithSessions;
  isExpanded: boolean;
  selectedSessions: Set<string>;
  activeTabSessionIds: string[];
  hasActiveTab: boolean;
  onToggleExpand: () => void;
  onToggleSession: (compositeId: string) => void;
  onSelectAll: (compositeIds: string[]) => void;
  onAddToTab: (compositeId: string) => void;
}> = ({
  project,
  isExpanded,
  selectedSessions,
  activeTabSessionIds,
  hasActiveTab,
  onToggleExpand,
  onToggleSession,
  onSelectAll,
  onAddToTab,
}) => {
  const compositeIds = project.sessions.map((s) => s.compositeId);
  const selectedCount = compositeIds.filter((id) => selectedSessions.has(id)).length;
  const allSelected = selectedCount === project.sessions.length && project.sessions.length > 0;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="mb-1">
      {/* Project Header */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors",
          isExpanded ? "bg-muted/50" : "hover:bg-muted/30",
        )}
        onClick={onToggleExpand}
      >
        <ChevronRightIcon
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0",
            isExpanded && "rotate-90",
          )}
        />
        <div
          className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{project.name}</div>
          <div className="text-[9px] text-muted-foreground font-mono truncate">
            {project.path}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground font-mono">
            {selectedCount > 0
              ? `${selectedCount}/${project.sessions.length}`
              : project.sessions.length}
          </span>
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={() => onSelectAll(compositeIds)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5"
          />
        </div>
      </div>

      {/* Sessions (collapsible) */}
      {isExpanded && (
        <div className="ml-5 pl-2 border-l border-border/50" style={{ borderColor: `${project.color}30` }}>
          {project.sessions.map((session) => (
            <SessionItem
              key={session.compositeId}
              session={session}
              projectColor={project.color}
              isSelected={selectedSessions.has(session.compositeId)}
              isInActiveTab={activeTabSessionIds.includes(session.compositeId)}
              hasActiveTab={hasActiveTab}
              onToggle={() => onToggleSession(session.compositeId)}
              onAddToTab={() => onAddToTab(session.compositeId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Implement ProjectSidebar**

```tsx
// src/features/session-manager/components/ProjectSidebar.tsx
import { Trans } from "@lingui/react";
import { SearchIcon } from "lucide-react";
import { type FC } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectWithSessions } from "../types";
import { filterProjects } from "../utils";
import { ProjectGroup } from "./ProjectGroup";

export const ProjectSidebar: FC<{
  projects: ProjectWithSessions[];
  expandedProjects: Set<string>;
  selectedSessions: Set<string>;
  searchQuery: string;
  activeTabSessionIds: string[];
  hasActiveTab: boolean;
  onSearchChange: (query: string) => void;
  onToggleProject: (projectId: string) => void;
  onToggleSession: (compositeId: string) => void;
  onSelectAllInProject: (compositeIds: string[]) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onAddToTab: (compositeId: string) => void;
}> = ({
  projects,
  expandedProjects,
  selectedSessions,
  searchQuery,
  activeTabSessionIds,
  hasActiveTab,
  onSearchChange,
  onToggleProject,
  onToggleSession,
  onSelectAllInProject,
  onSelectAll,
  onClearSelection,
  onAddToTab,
}) => {
  const filteredProjects = filterProjects(
    projects.map((p) => ({
      ...p,
      sessions: p.sessions.map((s) => ({ ...s, id: s.compositeId, title: s.title })),
    })),
    searchQuery,
  );

  // Map back to ProjectWithSessions shape after filtering
  const displayProjects = filteredProjects.map((fp) => {
    const original = projects.find((p) => p.id === fp.id);
    if (!original) return null;
    const filteredSessionIds = new Set(fp.sessions.map((s) => s.id));
    return {
      ...original,
      sessions: original.sessions.filter((s) => filteredSessionIds.has(s.compositeId)),
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="flex flex-col h-full border-r border-border bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            C
          </div>
          <div>
            <div className="text-sm font-semibold">Claude Code</div>
            <div className="text-[10px] text-muted-foreground">
              <Trans id="session-manager.title" />
            </div>
          </div>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search projects & sessions..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Project count */}
      <div className="px-4 py-2 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex justify-between">
        <span>Projects ({displayProjects.length})</span>
        <span>{selectedSessions.size} selected</span>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {displayProjects.map((project) => (
          <ProjectGroup
            key={project.id}
            project={project}
            isExpanded={expandedProjects.has(project.id)}
            selectedSessions={selectedSessions}
            activeTabSessionIds={activeTabSessionIds}
            hasActiveTab={hasActiveTab}
            onToggleExpand={() => onToggleProject(project.id)}
            onToggleSession={onToggleSession}
            onSelectAll={onSelectAllInProject}
            onAddToTab={onAddToTab}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={onSelectAll}
        >
          <Trans id="session-manager.select-all" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={onClearSelection}
        >
          <Trans id="session-manager.clear" />
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add src/features/session-manager/components/SessionItem.tsx src/features/session-manager/components/ProjectGroup.tsx src/features/session-manager/components/ProjectSidebar.tsx
git commit -m "feat: add project sidebar components for session manager"
```

---

## Task 6: TabBar and CanvasHeader Components

**Files:**
- Create: `src/features/session-manager/components/TabBar.tsx`
- Create: `src/features/session-manager/components/CanvasHeader.tsx`

- [ ] **Step 1: Implement TabBar**

```tsx
// src/features/session-manager/components/TabBar.tsx
import { Trans } from "@lingui/react";
import { PlusIcon, XIcon } from "lucide-react";
import { type FC, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SessionManagerTab } from "../types";

export const TabBar: FC<{
  tabs: SessionManagerTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabCreate: (name: string) => void;
}> = ({ tabs, activeTabId, onTabClick, onTabClose, onTabCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = () => {
    if (!newTabName.trim()) return;
    onTabCreate(newTabName.trim());
    setNewTabName("");
    setIsCreating(false);
  };

  return (
    <div className="flex items-end border-b border-border bg-muted/30 h-10 px-4 gap-0.5">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-t-md transition-colors text-xs",
              isActive
                ? "bg-background border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:bg-background/50",
            )}
            onClick={() => onTabClick(tab.id)}
          >
            <span>{tab.name}</span>
            <Badge variant="secondary" className="h-4 px-1 text-[9px] font-mono">
              {tab.sessionIds.length}
            </Badge>
            <button
              className={cn(
                "h-4 w-4 rounded-sm flex items-center justify-center transition-opacity",
                isActive ? "opacity-70 hover:opacity-100" : "opacity-30 hover:opacity-70",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {isCreating ? (
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            ref={inputRef}
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(false);
            }}
            placeholder="Tab name..."
            className="h-6 w-24 text-xs"
          />
          <Button size="sm" className="h-6 px-2 text-xs" onClick={handleCreate}>
            Add
          </Button>
        </div>
      ) : (
        <button
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsCreating(true)}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Implement CanvasHeader**

```tsx
// src/features/session-manager/components/CanvasHeader.tsx
import { Trans } from "@lingui/react";
import { Badge } from "@/components/ui/badge";
import type { FC } from "react";

export const CanvasHeader: FC<{
  tabName: string | null;
  sessionCount: number;
}> = ({ tabName, sessionCount }) => {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold">
          {tabName ?? <Trans id="session-manager.all-sessions" />}
        </h2>
        <span className="text-xs text-muted-foreground">
          {sessionCount} session{sessionCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add src/features/session-manager/components/TabBar.tsx src/features/session-manager/components/CanvasHeader.tsx
git commit -m "feat: add tab bar and canvas header components"
```

---

## Task 7: SessionCard Component

**Files:**
- Create: `src/features/session-manager/components/SessionCard.tsx`

- [ ] **Step 1: Implement SessionCard**

The card displays session metadata and is clickable to open the session detail. Follows the prototype's visual design using CCV's design system.

```tsx
// src/features/session-manager/components/SessionCard.tsx
import { Trans } from "@lingui/react";
import { XIcon } from "lucide-react";
import { type FC } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectSession } from "../types";

export const SessionCard: FC<{
  session: ProjectSession;
  projectColor: string;
  projectName: string;
  projectPath: string;
  onRemove: () => void;
  onClick: () => void;
}> = ({
  session,
  projectColor,
  projectName,
  projectPath,
  onRemove,
  onClick,
}) => {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card overflow-hidden",
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-border",
        "cursor-pointer",
      )}
      onClick={onClick}
    >
      {/* Color stripe */}
      <div className="h-0.5" style={{ backgroundColor: projectColor }} />

      {/* Main content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-semibold font-mono truncate">
                {session.title}
              </span>
              {session.status === "running" && (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              )}
              {session.status === "paused" && (
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
              )}
            </div>
            {session.firstUserMessage && (
              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                {session.firstUserMessage}
              </p>
            )}
            <p className="text-[9px] text-muted-foreground/60 font-mono mt-1 truncate">
              {projectPath}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-mono">
            {session.messageCount} msgs
          </Badge>
          {session.lastModifiedAt && (
            <span className="text-[9px] text-muted-foreground">
              {new Date(session.lastModifiedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/session-manager/components/SessionCard.tsx
git commit -m "feat: add session card component for grid display"
```

---

## Task 8: SessionGrid Component

**Files:**
- Create: `src/features/session-manager/components/SessionGrid.tsx`

- [ ] **Step 1: Implement SessionGrid**

```tsx
// src/features/session-manager/components/SessionGrid.tsx
import { Trans } from "@lingui/react";
import { HexagonIcon } from "lucide-react";
import type { FC } from "react";
import type { ProjectSession, ProjectWithSessions } from "../types";
import { parseCompositeId } from "../utils";
import { SessionCard } from "./SessionCard";

export const SessionGrid: FC<{
  sessionIds: string[];
  projects: ProjectWithSessions[];
  onRemove: (compositeId: string) => void;
  onCardClick: (projectId: string, sessionId: string) => void;
}> = ({ sessionIds, projects, onRemove, onCardClick }) => {
  // Build a lookup from compositeId to session + project info
  const sessionLookup = new Map<
    string,
    { session: ProjectSession; project: ProjectWithSessions }
  >();
  for (const project of projects) {
    for (const session of project.sessions) {
      sessionLookup.set(session.compositeId, { session, project });
    }
  }

  const displaySessions = sessionIds
    .map((id) => {
      const entry = sessionLookup.get(id);
      if (!entry) return null;
      return { compositeId: id, ...entry };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (displaySessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <HexagonIcon className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm font-semibold mb-1">
          <Trans id="session-manager.empty-tab" />
        </p>
        <p className="text-xs text-muted-foreground/70">
          <Trans id="session-manager.empty-tab-hint" />
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 p-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
    >
      {displaySessions.map(({ compositeId, session, project }, idx) => (
        <div
          key={compositeId}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
        >
          <SessionCard
            session={session}
            projectColor={project.color}
            projectName={project.name}
            projectPath={project.path}
            onRemove={() => onRemove(compositeId)}
            onClick={() => onCardClick(session.projectId, session.sessionId)}
          />
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/session-manager/components/SessionGrid.tsx
git commit -m "feat: add session grid component with responsive layout"
```

---

## Task 9: SessionDetailPanel (Click-to-Resume — Most Important Feature)

**Files:**
- Create: `src/features/session-manager/components/SessionDetailPanel.tsx`

This is the **most important feature** per the spec. When a user clicks a session card, an inline panel opens showing the session's conversation and a chat input for resuming.

- [ ] **Step 1: Implement SessionDetailPanel**

```tsx
// src/features/session-manager/components/SessionDetailPanel.tsx
import { Trans } from "@lingui/react";
import { ArrowLeftIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { type FC, Suspense, useMemo, useState } from "react";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSession } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { useSessionProcess } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSessionProcess";
import { ConversationList } from "@/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/ConversationList";
import { ResumeChat } from "@/app/projects/[projectId]/sessions/[sessionId]/components/resumeChat/ResumeChat";
import { ContinueChat } from "@/app/projects/[projectId]/sessions/[sessionId]/components/resumeChat/ContinueChat";
import { firstUserMessageToTitle } from "@/app/projects/[projectId]/services/firstCommandToTitle";

const SessionDetailContent: FC<{
  projectId: string;
  sessionId: string;
  onBack: () => void;
}> = ({ projectId, sessionId, onBack }) => {
  const sessionData = useSession(projectId, sessionId);
  const { getSessionProcess } = useSessionProcess();
  const relatedProcess = useMemo(
    () => getSessionProcess(sessionId),
    [getSessionProcess, sessionId],
  );
  const conversations = sessionData?.conversations ?? [];
  const emptyToolResult: ReturnType<typeof useSession>["getToolResult"] = () => undefined;
  const getToolResult = sessionData?.getToolResult ?? emptyToolResult;

  const sessionTitle =
    sessionData?.session.meta.firstUserMessage != null
      ? firstUserMessageToTitle(sessionData.session.meta.firstUserMessage)
      : sessionId;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onBack}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{sessionTitle}</h3>
        </div>
        {relatedProcess?.status && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] h-5",
              relatedProcess.status === "running" &&
                "bg-green-500/10 text-green-600 dark:text-green-400",
              relatedProcess.status === "paused" &&
                "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
            )}
          >
            {relatedProcess.status === "running" ? (
              <Trans id="session.status.running" />
            ) : (
              <Trans id="session.status.paused" />
            )}
          </Badge>
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4">
        <ConversationList
          conversations={conversations}
          getToolResult={getToolResult}
          projectId={projectId}
          sessionId={sessionId}
          scheduledJobs={[]}
        />
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur">
        {relatedProcess ? (
          <ContinueChat
            projectId={projectId}
            sessionId={sessionId}
            sessionProcessId={relatedProcess.id}
            sessionProcessStatus={relatedProcess.status}
          />
        ) : (
          <ResumeChat projectId={projectId} sessionId={sessionId} />
        )}
      </div>
    </div>
  );
};

export const SessionDetailPanel: FC<{
  projectId: string;
  sessionId: string;
  onBack: () => void;
}> = (props) => {
  return (
    <Suspense fallback={<Loading />}>
      <SessionDetailContent {...props} />
    </Suspense>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/session-manager/components/SessionDetailPanel.tsx
git commit -m "feat: add session detail panel with resume chat capability"
```

---

## Task 10: SessionManagerView Top-Level Layout

**Files:**
- Create: `src/features/session-manager/components/SessionManagerView.tsx`
- Create: `src/features/session-manager/index.ts`

- [ ] **Step 1: Implement SessionManagerView**

```tsx
// src/features/session-manager/components/SessionManagerView.tsx
import { type FC, Suspense, useState } from "react";
import { Loading } from "@/components/Loading";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAllProjectSessions } from "../hooks/useAllProjectSessions";
import { useSessionManager } from "../hooks/useSessionManager";
import { CanvasHeader } from "./CanvasHeader";
import { ProjectSidebar } from "./ProjectSidebar";
import { SessionDetailPanel } from "./SessionDetailPanel";
import { SessionGrid } from "./SessionGrid";
import { TabBar } from "./TabBar";

const SessionManagerContent: FC = () => {
  const projects = useAllProjectSessions();
  const manager = useSessionManager();
  const isMobile = useIsMobile();

  const [activeSession, setActiveSession] = useState<{
    projectId: string;
    sessionId: string;
  } | null>(null);

  const activeTabSessionIds = manager.currentTab?.sessionIds ?? [];
  const displaySessionIds = manager.currentTab
    ? activeTabSessionIds
    : [...manager.selectedSessions];

  const allCompositeIds = projects.flatMap((p) =>
    p.sessions.map((s) => s.compositeId),
  );

  const handleCardClick = (projectId: string, sessionId: string) => {
    setActiveSession({ projectId, sessionId });
  };

  const handleBack = () => {
    setActiveSession(null);
  };

  // If a session is open, show the detail panel
  if (activeSession) {
    return (
      <div className="flex h-screen">
        {!isMobile && (
          <div className="w-[290px] min-w-[290px]">
            <ProjectSidebar
              projects={projects}
              expandedProjects={manager.expandedProjects}
              selectedSessions={manager.selectedSessions}
              searchQuery={manager.searchQuery}
              activeTabSessionIds={activeTabSessionIds}
              hasActiveTab={manager.activeTabId !== null}
              onSearchChange={manager.setSearchQuery}
              onToggleProject={manager.toggleProject}
              onToggleSession={manager.toggleSession}
              onSelectAllInProject={manager.selectAllInProject}
              onSelectAll={() => manager.selectAll(allCompositeIds)}
              onClearSelection={manager.clearSelection}
              onAddToTab={manager.addToTab}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <SessionDetailPanel
            projectId={activeSession.projectId}
            sessionId={activeSession.sessionId}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className={isMobile ? "hidden" : "w-[290px] min-w-[290px]"}>
        <ProjectSidebar
          projects={projects}
          expandedProjects={manager.expandedProjects}
          selectedSessions={manager.selectedSessions}
          searchQuery={manager.searchQuery}
          activeTabSessionIds={activeTabSessionIds}
          hasActiveTab={manager.activeTabId !== null}
          onSearchChange={manager.setSearchQuery}
          onToggleProject={manager.toggleProject}
          onToggleSession={manager.toggleSession}
          onSelectAllInProject={manager.selectAllInProject}
          onSelectAll={() => manager.selectAll(allCompositeIds)}
          onClearSelection={manager.clearSelection}
          onAddToTab={manager.addToTab}
        />
      </div>

      {/* Right Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <TabBar
          tabs={manager.tabs}
          activeTabId={manager.activeTabId}
          onTabClick={manager.setActiveTabId}
          onTabClose={manager.closeTab}
          onTabCreate={manager.createTab}
        />
        <CanvasHeader
          tabName={manager.currentTab?.name ?? null}
          sessionCount={displaySessionIds.length}
        />
        <div className="flex-1 overflow-auto">
          <SessionGrid
            sessionIds={displaySessionIds}
            projects={projects}
            onRemove={manager.removeFromTab}
            onCardClick={handleCardClick}
          />
        </div>
      </div>
    </div>
  );
};

export const SessionManagerView: FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <SessionManagerContent />
    </Suspense>
  );
};
```

- [ ] **Step 2: Create index.ts**

```typescript
// src/features/session-manager/index.ts
export { SessionManagerView } from "./components/SessionManagerView";
```

- [ ] **Step 3: Commit**

```bash
git add src/features/session-manager/components/SessionManagerView.tsx src/features/session-manager/index.ts
git commit -m "feat: add session manager view with sidebar + canvas layout"
```

---

## Task 11: Route Registration

**Files:**
- Create: `src/routes/session-manager.tsx`

- [ ] **Step 1: Create the route**

```tsx
// src/routes/session-manager.tsx
import { createFileRoute } from "@tanstack/react-router";
import { SessionManagerView } from "../features/session-manager";
import { ProtectedRoute } from "../components/ProtectedRoute";

export const Route = createFileRoute("/session-manager")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProtectedRoute>
      <title>Session Manager - Claude Code Viewer</title>
      <SessionManagerView />
    </ProtectedRoute>
  );
}
```

- [ ] **Step 2: Regenerate the TanStack Router route tree**

Run: `pnpm exec tsr generate`

This command regenerates `src/routeTree.gen.ts` to include the new `/session-manager` route.

- [ ] **Step 3: Add navigation link from ProjectsPage**

Modify `src/app/projects/page.tsx` to add a link to the session manager. Read the file first, then add a `Link` to `/session-manager` in the header area next to the existing "Projects" title, e.g. a "Session Manager" button.

```tsx
// Add to imports:
import { Link } from "@tanstack/react-router";
import { LayoutGridIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// In the header, add alongside SetupProjectDialog:
<Link to="/session-manager">
  <Button variant="outline" size="sm">
    <LayoutGridIcon className="w-4 h-4 mr-2" />
    <Trans id="session-manager.title" />
  </Button>
</Link>
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/session-manager.tsx src/app/projects/page.tsx src/routeTree.gen.ts
git commit -m "feat: add /session-manager route and navigation link"
```

---

## Task 12: i18n Strings

**Files:**
- Modify: `src/lib/i18n/locales/en/messages.json`
- Modify: `src/lib/i18n/locales/ja/messages.json`
- Modify: `src/lib/i18n/locales/zh_CN/messages.json`

- [ ] **Step 1: Add English translations**

Add these keys to the `en` messages file:

```json
{
  "session-manager.title": { "translation": "Session Manager" },
  "session-manager.select-all": { "translation": "Select All" },
  "session-manager.clear": { "translation": "Clear" },
  "session-manager.all-sessions": { "translation": "All Sessions" },
  "session-manager.empty-tab": { "translation": "No sessions in this tab" },
  "session-manager.empty-tab-hint": { "translation": "Select sessions from the sidebar and click '+ Tab' to add them" }
}
```

- [ ] **Step 2: Add Japanese translations**

```json
{
  "session-manager.title": { "translation": "セッションマネージャー" },
  "session-manager.select-all": { "translation": "すべて選択" },
  "session-manager.clear": { "translation": "クリア" },
  "session-manager.all-sessions": { "translation": "全セッション" },
  "session-manager.empty-tab": { "translation": "このタブにセッションはありません" },
  "session-manager.empty-tab-hint": { "translation": "サイドバーからセッションを選択し、「+ Tab」をクリックして追加してください" }
}
```

- [ ] **Step 3: Add Chinese translations**

```json
{
  "session-manager.title": { "translation": "会话管理器" },
  "session-manager.select-all": { "translation": "全选" },
  "session-manager.clear": { "translation": "清除" },
  "session-manager.all-sessions": { "translation": "所有会话" },
  "session-manager.empty-tab": { "translation": "此标签页中没有会话" },
  "session-manager.empty-tab-hint": { "translation": "从侧边栏选择会话并点击 '+ Tab' 添加" }
}
```

- [ ] **Step 4: Compile Lingui catalogs**

Run: `pnpm exec lingui compile`

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/locales/
git commit -m "chore: add session manager i18n strings for en, ja, zh-CN"
```

---

## Task 13: useAllProjectSessions Refinement Based on API

**Files:**
- Modify: `src/features/session-manager/hooks/useAllProjectSessions.ts`

- [ ] **Step 1: Read the actual project routes response shape**

Read `src/server/hono/routes/projectRoutes.ts` and `src/server/core/project/presentation/ProjectController.ts` to understand what `GET /api/projects` returns. Adjust `useAllProjectSessions` to match the actual API response shape.

The project list endpoint may not include sessions inline — it may only list project metadata. In that case, the hook needs to:
1. Fetch the project list via `projectListQuery`
2. For each project, fetch sessions via `projectDetailQuery(projectId)` using `useQueries` from TanStack Query

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors in session-manager files

- [ ] **Step 3: Commit if changes were needed**

```bash
git add src/features/session-manager/hooks/useAllProjectSessions.ts
git commit -m "chore: refine useAllProjectSessions to match actual API shape"
```

---

## Task 14: Quality Checks and Final Verification

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — no type errors

- [ ] **Step 2: Run Biome fix**

Run: `pnpm fix`
Expected: All formatting/linting issues auto-fixed

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: PASS — all existing + new tests pass

- [ ] **Step 4: Manual verification**

Start the dev server and verify:
1. Navigate to `/projects` and click "Session Manager" button
2. See project-grouped sidebar with all projects
3. Expand projects, check/uncheck sessions
4. Create a tab, verify grid populates
5. Click a session card → see detail panel with conversation + chat input
6. Type a message and resume the session
7. Switch tabs, verify grid updates
8. Search filters projects and sessions
9. Dark/light theme works
10. Tab configuration persists across page reload

- [ ] **Step 5: Final commit with any fixes**

```bash
git add -A
git commit -m "feat: session manager polish and fixes"
```

---

## Implementation Notes

### Critical Path
The most important feature per the spec is **clicking a card to resume a session with chat input** (Task 9). This reuses the existing `ResumeChat`, `ContinueChat`, and `ConversationList` components. The `SessionDetailPanel` composes them into an inline view within the session manager.

### API Data Shape
Task 13 is a refinement step because the `useAllProjectSessions` hook (Task 4) may need adjustment once the actual API response shape is confirmed. The implementer should verify this early.

### What's Deferred (Phase 5 per spec)
- Drag-and-drop tab reordering
- Drag sessions between tabs
- Tab templates
- Session comparison view
- Bulk actions
- Server-side tab persistence
- SSE real-time status updates in the grid (the `sessionProcessesAtom` already provides live status, but SSE event-driven invalidation for the session manager specifically is not wired)
- Mobile drawer for sidebar (basic mobile hiding is done, but the full drawer UX is deferred)
- `⌘K` search extension
- Context menu (right-click) on cards
- `--dangerously-skip-permissions` toggle button

### Key Patterns Followed
- **Hono RPC + TanStack Query** for all API calls (no raw fetch)
- **Lingui `<Trans>`** for all user-facing strings
- **shadcn/ui** components (`Button`, `Badge`, `Input`, `Checkbox`, `Tooltip`)
- **Tailwind + CSS variables** for styling (respects dark/light theme)
- **No `as` casting** anywhere
- **TDD** for hooks and utilities (components are harder to unit test meaningfully, so manual verification is used)
