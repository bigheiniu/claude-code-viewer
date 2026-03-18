import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { type FC, Suspense, useCallback, useEffect, useState } from "react";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAllProjectSessions } from "../hooks/useAllProjectSessions";
import { useSessionManager } from "../hooks/useSessionManager";
import { filterProjects } from "../utils";
import { CanvasHeader } from "./CanvasHeader";
import { ProjectSidebar } from "./ProjectSidebar";
import { SessionGrid } from "./SessionGrid";
import { TabBar } from "./TabBar";

const SessionManagerContent: FC = () => {
  const { projects } = useAllProjectSessions();
  const manager = useSessionManager();
  const isMobile = useIsMobile();

  const activeTabSessionIds = manager.currentTab?.sessionIds ?? [];
  const displaySessionIds = manager.currentTab
    ? activeTabSessionIds
    : [...manager.selectedSessions];

  // Bug #2 fix: Compute allCompositeIds from filtered projects
  const filteredProjects = filterProjects(
    projects.map((p) => ({
      ...p,
      sessions: p.sessions.map((s) => ({
        ...s,
        id: s.compositeId,
        title: s.title,
      })),
    })),
    manager.searchQuery,
  );
  const allCompositeIds = filteredProjects.flatMap((p) =>
    p.sessions.map((s) => s.id),
  );

  // Bug #3 fix: When a tab is active, toggle should add/remove from tab
  const handleToggleSession = useCallback(
    (compositeId: string) => {
      if (manager.activeTabId) {
        // If session is in active tab, remove it; otherwise add it
        if (activeTabSessionIds.includes(compositeId)) {
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
      if (!activeTabSessionIds.includes(id)) {
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
    />
  );

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={
            sidebarCollapsed
              ? "w-0 min-w-0 overflow-hidden"
              : "w-[290px] min-w-[290px]"
          }
        >
          {sidebarContent}
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
          sessionCount={displaySessionIds.length}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          hasExpandedCards={manager.expandedCards.size > 0}
        />
        <div className="flex-1 overflow-auto">
          <SessionGrid
            sessionIds={displaySessionIds}
            projects={projects}
            expandedCards={manager.expandedCards}
            savedLayout={manager.currentGridLayout}
            onRemove={handleRemoveSession}
            onToggleExpand={manager.toggleCardExpanded}
            onLayoutChange={manager.updateGridLayout}
            getPermissionMode={manager.getPermissionMode}
            onTogglePermission={manager.togglePermissionMode}
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
