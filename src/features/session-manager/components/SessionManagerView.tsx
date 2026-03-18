import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { MenuIcon, PanelLeftIcon } from "lucide-react";
import {
  type FC,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { sessionProcessesAtom } from "@/app/projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useIsMobile";
import { honoClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAllProjectSessions } from "../hooks/useAllProjectSessions";
import { useSessionManager } from "../hooks/useSessionManager";
import type { ProjectSession } from "../types";
import { filterProjects } from "../utils";
import { CanvasHeader } from "./CanvasHeader";
import { ProjectSidebar } from "./ProjectSidebar";
import { SessionGrid } from "./SessionGrid";
import { TabBar } from "./TabBar";

const SessionManagerContent: FC = () => {
  const { projects } = useAllProjectSessions();
  const manager = useSessionManager();
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState("recent");

  const sessionProcesses = useAtomValue(sessionProcessesAtom);
  const runningProcesses = useMemo(
    () => sessionProcesses.filter((p) => p.status === "running"),
    [sessionProcesses],
  );

  const stopAllMutation = useMutation({
    mutationFn: async () => {
      const abortPromises = runningProcesses.map((process) =>
        honoClient.api["claude-code"]["session-processes"][
          ":sessionProcessId"
        ].abort.$post({
          param: { sessionProcessId: process.id },
          json: { projectId: process.projectId },
        }),
      );
      await Promise.allSettled(abortPromises);
    },
    onSuccess: () => {
      toast.success(`Stopped ${runningProcesses.length} running session(s)`);
    },
    onError: (error) => {
      toast.error(
        `Failed to stop some sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });

  const activeTabSessionIds = useMemo(
    () => new Set(manager.currentTab?.sessionIds ?? []),
    [manager.currentTab?.sessionIds],
  );
  const newSessionIds = useMemo(
    () => manager.newSessionCards.map((c) => c.compositeId),
    [manager.newSessionCards],
  );

  const displaySessionIds = useMemo(() => {
    const base = manager.currentTab
      ? (manager.currentTab.sessionIds ?? [])
      : [...manager.selectedSessions];
    // Include new session cards that aren't already in the list
    const baseSet = new Set(base);
    const extras = newSessionIds.filter((id) => !baseSet.has(id));
    return [...base, ...extras];
  }, [manager.currentTab, manager.selectedSessions, newSessionIds]);

  // Bug #2 fix: Compute allCompositeIds from filtered projects
  const filteredProjects = useMemo(
    () =>
      filterProjects(
        projects.map((p) => ({
          ...p,
          sessions: p.sessions.map((s) => ({
            ...s,
            id: s.compositeId,
            title: s.title,
          })),
        })),
        manager.searchQuery,
      ),
    [projects, manager.searchQuery],
  );
  const allCompositeIds = useMemo(
    () => filteredProjects.flatMap((p) => p.sessions.map((s) => s.id)),
    [filteredProjects],
  );

  // Build a lookup map for sorting
  const sessionLookup = useMemo(() => {
    const map = new Map<string, ProjectSession>();
    for (const p of projects) {
      for (const s of p.sessions) {
        map.set(s.compositeId, s);
      }
    }
    return map;
  }, [projects]);

  const aggregateStats = useMemo(() => {
    let totalCostUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const id of displaySessionIds) {
      const session = sessionLookup.get(id);
      if (!session) continue;
      totalCostUsd += session.costUsd ?? 0;
      totalInputTokens += session.inputTokens ?? 0;
      totalOutputTokens += session.outputTokens ?? 0;
    }
    return { totalCostUsd, totalInputTokens, totalOutputTokens };
  }, [displaySessionIds, sessionLookup]);

  const sortedSessionIds = useMemo(() => {
    return [...displaySessionIds].sort((a, b) => {
      const sa = sessionLookup.get(a);
      const sb = sessionLookup.get(b);
      if (!sa || !sb) return 0;
      switch (sortBy) {
        case "oldest": {
          const da = sa.lastModifiedAt
            ? new Date(sa.lastModifiedAt).getTime()
            : 0;
          const db = sb.lastModifiedAt
            ? new Date(sb.lastModifiedAt).getTime()
            : 0;
          return da - db;
        }
        case "messages":
          return sb.messageCount - sa.messageCount;
        case "name":
          return sa.title.localeCompare(sb.title);
        default: {
          // "recent"
          const da = sa.lastModifiedAt
            ? new Date(sa.lastModifiedAt).getTime()
            : 0;
          const db = sb.lastModifiedAt
            ? new Date(sb.lastModifiedAt).getTime()
            : 0;
          return db - da;
        }
      }
    });
  }, [displaySessionIds, sortBy, sessionLookup]);

  // Bug #3 fix: When a tab is active, toggle should add/remove from tab
  const handleToggleSession = useCallback(
    (compositeId: string) => {
      if (manager.activeTabId) {
        // If session is in active tab, remove it; otherwise add it
        if (activeTabSessionIds.has(compositeId)) {
          manager.removeFromTab(compositeId);
        } else {
          manager.addToTab(compositeId);
        }
      } else {
        // No active tab, use regular toggle
        manager.toggleSession(compositeId);
      }
    },
    [manager, activeTabSessionIds],
  );

  const handleRemoveSession = useCallback(
    (compositeId: string) => {
      if (manager.currentTab) {
        manager.removeFromTab(compositeId);
      } else {
        // When no active tab, deselect the session instead
        manager.toggleSession(compositeId);
      }
    },
    [manager],
  );

  const handleAddSelectedToTab = useCallback(() => {
    if (!manager.activeTabId) return;
    for (const id of manager.selectedSessions) {
      if (!activeTabSessionIds.has(id)) {
        manager.addToTab(id);
      }
    }
  }, [manager, activeTabSessionIds]);

  const handleExpandAll = useCallback(() => {
    for (const id of displaySessionIds) {
      if (!manager.expandedCards.has(id)) {
        manager.toggleCardExpanded(id);
      }
    }
  }, [displaySessionIds, manager]);

  const handleCollapseAll = useCallback(() => {
    for (const id of displaySessionIds) {
      if (manager.expandedCards.has(id)) {
        manager.toggleCardExpanded(id);
      }
    }
  }, [displaySessionIds, manager]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "t") {
        e.preventDefault();
        manager.createTab(`Tab ${manager.tabs.length + 1}`);
      } else if (e.key === "w" && manager.activeTabId) {
        e.preventDefault();
        manager.closeTab(manager.activeTabId);
      } else if (e.key >= "1" && e.key <= "9") {
        const index = Number.parseInt(e.key, 10) - 1;
        const tab = manager.tabs[index];
        if (tab) {
          e.preventDefault();
          manager.setActiveTabId(tab.id);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [manager]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(290);
  const isResizing = useRef(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const sidebarContent = (
    <ProjectSidebar
      projects={projects}
      expandedProjects={manager.expandedProjects}
      selectedSessions={manager.selectedSessions}
      searchQuery={manager.searchQuery}
      activeTabSessionIds={activeTabSessionIds}
      hasActiveTab={manager.activeTabId !== null}
      onSearchChange={manager.setSearchQuery}
      onToggleProject={manager.toggleProject}
      onToggleSession={handleToggleSession}
      onSelectAllInProject={manager.selectAllInProject}
      onSelectAll={() => manager.selectAll(allCompositeIds)}
      onClearSelection={manager.clearSelection}
      onAddToTab={manager.addToTab}
      onAddSelectedToTab={handleAddSelectedToTab}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      hiddenCount={manager.hiddenSessions.size}
      hiddenSessions={manager.hiddenSessions}
      onToggleHide={(compositeId) => {
        if (manager.hiddenSessions.has(compositeId)) {
          manager.unhideSession(compositeId);
        } else {
          manager.hideSession(compositeId);
        }
      }}
      onNewSession={(projectId, projectPath, projectColor, projectName) => {
        manager.createNewSession({
          projectId,
          projectPath,
          projectColor,
          projectName,
        });
        toast.success(`New session created for ${projectName}`);
      }}
    />
  );

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={cn(
            "transition-all duration-200 ease-in-out relative",
            sidebarCollapsed ? "w-0 min-w-0 overflow-hidden" : "",
          )}
          style={
            sidebarCollapsed
              ? undefined
              : { width: sidebarWidth, minWidth: 220, maxWidth: 500 }
          }
        >
          {sidebarContent}
          {/* Resize handle */}
          {!sidebarCollapsed && (
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-20"
              onMouseDown={(e) => {
                e.preventDefault();
                isResizing.current = true;
                const startX = e.clientX;
                const startWidth = sidebarWidth;
                const onMouseMove = (ev: MouseEvent) => {
                  if (!isResizing.current) return;
                  const newWidth = Math.min(
                    500,
                    Math.max(220, startWidth + (ev.clientX - startX)),
                  );
                  setSidebarWidth(newWidth);
                };
                const onMouseUp = () => {
                  isResizing.current = false;
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
            />
          )}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-[290px] bg-background shadow-xl z-50">
            {sidebarContent}
          </div>
          <div
            className="flex-1 bg-black/30"
            onClick={() => setMobileSidebarOpen(false)}
            onKeyDown={() => {}}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center">
          {isMobile ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 mr-1"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 mr-1"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              <PanelLeftIcon className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <TabBar
              tabs={manager.tabs}
              activeTabId={manager.activeTabId}
              onTabClick={manager.setActiveTabId}
              onTabClose={manager.closeTab}
              onTabCreate={manager.createTab}
              onTabRename={manager.renameTab}
            />
          </div>
        </div>
        <CanvasHeader
          tabName={manager.currentTab?.name ?? null}
          sessionCount={sortedSessionIds.length}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          hasExpandedCards={manager.expandedCards.size > 0}
          sortBy={sortBy}
          onSortChange={setSortBy}
          runningCount={runningProcesses.length}
          onStopAll={() => stopAllMutation.mutate()}
          isStoppingAll={stopAllMutation.isPending}
          totalCostUsd={aggregateStats.totalCostUsd}
          totalInputTokens={aggregateStats.totalInputTokens}
          totalOutputTokens={aggregateStats.totalOutputTokens}
        />
        <div className="flex-1 overflow-auto">
          <SessionGrid
            sessionIds={sortedSessionIds}
            projects={projects}
            expandedCards={manager.expandedCards}
            savedLayout={manager.currentGridLayout}
            newSessionCards={manager.newSessionCards}
            onRemove={handleRemoveSession}
            onToggleExpand={manager.toggleCardExpanded}
            onLayoutChange={manager.updateGridLayout}
            getPermissionMode={manager.getPermissionMode}
            onTogglePermission={manager.togglePermissionMode}
            onRemoveNewSession={manager.removeNewSession}
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
