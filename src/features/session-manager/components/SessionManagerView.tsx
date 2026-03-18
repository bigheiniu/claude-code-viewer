import { type FC, Suspense, useCallback, useState } from "react";
import { Loading } from "@/components/Loading";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAllProjectSessions } from "../hooks/useAllProjectSessions";
import { useSessionManager } from "../hooks/useSessionManager";
import { makeCompositeId } from "../utils";
import { CanvasHeader } from "./CanvasHeader";
import { ProjectSidebar } from "./ProjectSidebar";
import { SessionDetailPanel } from "./SessionDetailPanel";
import { SessionGrid } from "./SessionGrid";
import { TabBar } from "./TabBar";

const SessionManagerContent: FC = () => {
  const { projects } = useAllProjectSessions();
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

  const handleCardClick = useCallback(
    (projectId: string, sessionId: string) => {
      setActiveSession({ projectId, sessionId });
    },
    [],
  );

  const handleBack = useCallback(() => {
    setActiveSession(null);
  }, []);

  const activeCompositeId = activeSession
    ? makeCompositeId(activeSession.projectId, activeSession.sessionId)
    : null;

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
            permissionMode={
              activeCompositeId
                ? manager.getPermissionMode(activeCompositeId)
                : "default"
            }
            onBack={handleBack}
            onTogglePermission={() => {
              if (activeCompositeId) {
                manager.togglePermissionMode(activeCompositeId);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
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
