import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import {
  ClockIcon,
  EyeOffIcon,
  MessageSquareIcon,
  SearchIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { type FC, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectWithSessions } from "../types";
import { filterProjects } from "../utils";
import { ProjectGroup } from "./ProjectGroup";

export const ProjectSidebar: FC<{
  projects: ProjectWithSessions[];
  expandedProjects: Set<string>;
  selectedSessions: Set<string>;
  searchQuery: string;
  activeTabSessionIds: Set<string>;
  hasActiveTab: boolean;
  onSearchChange: (query: string) => void;
  onToggleProject: (projectId: string) => void;
  onToggleSession: (compositeId: string) => void;
  onSelectAllInProject: (compositeIds: string[]) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onAddToTab: (compositeId: string) => void;
  onAddSelectedToTab?: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  hiddenCount: number;
  hiddenSessions: Set<string>;
  onToggleHide: (compositeId: string) => void;
  onNewSession: (
    projectId: string,
    projectPath: string,
    projectColor: string,
    projectName: string,
  ) => void;
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
  onAddSelectedToTab,
  activeFilter,
  onFilterChange,
  hiddenCount,
  hiddenSessions,
  onToggleHide,
  onNewSession,
}) => {
  const filteredProjects = useMemo(
    () =>
      filterProjects(
        projects.map((p) => ({
          ...p,
          sessions: p.sessions.map((s) => ({
            ...s,
            id: s.compositeId,
            title: s.title,
            firstUserMessage: s.firstUserMessage,
          })),
        })),
        searchQuery,
      ),
    [projects, searchQuery],
  );

  const displayProjects = useMemo(
    () =>
      filteredProjects
        .map((fp) => {
          const original = projects.find((p) => p.id === fp.id);
          if (!original) return null;
          const filteredSessionIds = new Set(fp.sessions.map((s) => s.id));
          return {
            ...original,
            sessions: original.sessions.filter((s) =>
              filteredSessionIds.has(s.compositeId),
            ),
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null),
    [filteredProjects, projects],
  );

  const finalProjects = useMemo(() => {
    let result = displayProjects;

    if (activeFilter === "hidden") {
      result = result
        .map((p) => ({
          ...p,
          sessions: p.sessions.filter((s) => hiddenSessions.has(s.compositeId)),
        }))
        .filter((p) => p.sessions.length > 0);
    } else {
      // Always hide hidden sessions unless viewing hidden filter
      result = result
        .map((p) => ({
          ...p,
          sessions: p.sessions.filter(
            (s) => !hiddenSessions.has(s.compositeId),
          ),
        }))
        .filter((p) => p.sessions.length > 0);

      if (activeFilter === "recent-1d") {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        result = result
          .map((p) => ({
            ...p,
            sessions: p.sessions.filter((s) =>
              s.lastModifiedAt
                ? new Date(s.lastModifiedAt).getTime() > cutoff
                : false,
            ),
          }))
          .filter((p) => p.sessions.length > 0);
      } else if (activeFilter === "most-messages") {
        const allSessions = result.flatMap((p) => p.sessions);
        const topIds = new Set(
          [...allSessions]
            .sort((a, b) => b.messageCount - a.messageCount)
            .slice(0, 20)
            .map((s) => s.compositeId),
        );
        result = result
          .map((p) => ({
            ...p,
            sessions: p.sessions.filter((s) => topIds.has(s.compositeId)),
          }))
          .filter((p) => p.sessions.length > 0);
      } else if (activeFilter === "running") {
        result = result
          .map((p) => ({
            ...p,
            sessions: p.sessions.filter(
              (s) => s.status === "running" || s.status === "paused",
            ),
          }))
          .filter((p) => p.sessions.length > 0);
      }
    }

    return result;
  }, [displayProjects, activeFilter, hiddenSessions]);

  const selectedNotInTab = hasActiveTab
    ? [...selectedSessions].filter((id) => !activeTabSessionIds.has(id))
    : [];

  return (
    <div className="flex flex-col h-full border-r border-border bg-sidebar">
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 mb-3 no-underline">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            C
          </div>
          <div>
            <div className="text-sm font-semibold">Claude Code</div>
            <div className="text-[10px] text-muted-foreground">
              <Trans id="session-manager.title" />
            </div>
          </div>
        </Link>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search projects & sessions..."
            className="pl-8 pr-8 h-8 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => onSearchChange("")}
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Smart filter tags */}
      <div className="px-4 py-2 flex flex-wrap gap-1.5">
        {[
          { id: "all", label: "All", icon: null },
          { id: "recent-1d", label: "Last 24h", icon: ClockIcon },
          { id: "most-messages", label: "Most msgs", icon: MessageSquareIcon },
          { id: "running", label: "Running", icon: ZapIcon },
        ].map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors border",
              activeFilter === filter.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
            )}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.icon && <filter.icon className="h-3 w-3" />}
            {filter.label}
          </button>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors border",
              activeFilter === "hidden"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
            )}
            onClick={() => onFilterChange("hidden")}
          >
            <EyeOffIcon className="h-3 w-3" />
            Hidden ({hiddenCount})
          </button>
        )}
      </div>

      <div className="px-4 py-2 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex justify-between">
        <span>Projects ({finalProjects.length})</span>
        <span>{selectedSessions.size} selected</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {finalProjects.map((project) => {
          const isExpanded = searchQuery.trim()
            ? true
            : expandedProjects.has(project.id);
          return (
            <ProjectGroup
              key={project.id}
              project={project}
              isExpanded={isExpanded}
              selectedSessions={selectedSessions}
              activeTabSessionIds={activeTabSessionIds}
              hasActiveTab={hasActiveTab}
              hiddenSessions={hiddenSessions}
              onToggleExpand={() => onToggleProject(project.id)}
              onToggleSession={onToggleSession}
              onSelectAll={onSelectAllInProject}
              onAddToTab={onAddToTab}
              onToggleHide={onToggleHide}
              onNewSession={() =>
                onNewSession(
                  project.id,
                  project.path,
                  project.color,
                  project.name,
                )
              }
            />
          );
        })}
      </div>

      <div className="p-2 border-t border-sidebar-border space-y-2">
        {hasActiveTab && selectedNotInTab.length > 0 && onAddSelectedToTab && (
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs h-7"
            onClick={onAddSelectedToTab}
          >
            Add {selectedNotInTab.length} to Tab
          </Button>
        )}
        <div className="flex gap-2">
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
    </div>
  );
};
