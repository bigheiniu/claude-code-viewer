import { ChevronRightIcon, PlusCircleIcon } from "lucide-react";
import { type FC, memo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProjectWithSessions } from "../types";
import { SessionItem } from "./SessionItem";

export const ProjectGroup: FC<{
  project: ProjectWithSessions;
  isExpanded: boolean;
  selectedSessions: Set<string>;
  activeTabSessionIds: Set<string>;
  hasActiveTab: boolean;
  hiddenSessions: Set<string>;
  onToggleExpand: () => void;
  onToggleSession: (compositeId: string) => void;
  onSelectAll: (compositeIds: string[]) => void;
  onAddToTab: (compositeId: string) => void;
  onToggleHide: (compositeId: string) => void;
  onNewSession: () => void;
}> = memo(
  ({
    project,
    isExpanded,
    selectedSessions,
    activeTabSessionIds,
    hasActiveTab,
    hiddenSessions,
    onToggleExpand,
    onToggleSession,
    onSelectAll,
    onAddToTab,
    onToggleHide,
    onNewSession,
  }) => {
    const compositeIds = project.sessions.map((s) => s.compositeId);
    const selectedCount = compositeIds.filter((id) =>
      selectedSessions.has(id),
    ).length;
    const allSelected =
      selectedCount === project.sessions.length && project.sessions.length > 0;
    const someSelected = selectedCount > 0 && !allSelected;

    return (
      <div className="mb-1">
        <button
          type="button"
          className={cn(
            "group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors w-full text-left",
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
                : `${project.sessions.length}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onNewSession();
              }}
            >
              <PlusCircleIcon className="h-3.5 w-3.5" />
            </Button>
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={() => onSelectAll(compositeIds)}
              onClick={(e) => e.stopPropagation()}
              className="h-3.5 w-3.5"
            />
          </div>
        </button>

        {isExpanded && (
          <div
            className="ml-5 pl-2 border-l border-border/50"
            style={{ borderColor: `${project.color}30` }}
          >
            {project.sessions.map((session) => (
              <SessionItem
                key={session.compositeId}
                session={session}
                projectColor={project.color}
                isSelected={selectedSessions.has(session.compositeId)}
                isInActiveTab={activeTabSessionIds.has(session.compositeId)}
                isHidden={hiddenSessions.has(session.compositeId)}
                hasActiveTab={hasActiveTab}
                onToggle={() => onToggleSession(session.compositeId)}
                onAddToTab={() => onAddToTab(session.compositeId)}
                onToggleHide={() => onToggleHide(session.compositeId)}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
