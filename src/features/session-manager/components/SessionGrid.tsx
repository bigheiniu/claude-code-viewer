import { Trans } from "@lingui/react";
import { HexagonIcon } from "lucide-react";
import type { FC } from "react";
import type {
  PermissionMode,
  ProjectSession,
  ProjectWithSessions,
} from "../types";
import { SessionCard } from "./SessionCard";

export const SessionGrid: FC<{
  sessionIds: string[];
  projects: ProjectWithSessions[];
  onRemove: (compositeId: string) => void;
  onCardClick: (projectId: string, sessionId: string) => void;
  getPermissionMode: (compositeId: string) => PermissionMode;
  onTogglePermission: (compositeId: string) => void;
}> = ({
  sessionIds,
  projects,
  onRemove,
  onCardClick,
  getPermissionMode,
  onTogglePermission,
}) => {
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
          style={{
            animationDelay: `${idx * 50}ms`,
            animationFillMode: "both",
          }}
        >
          <SessionCard
            session={session}
            projectColor={project.color}
            projectPath={project.path}
            permissionMode={getPermissionMode(compositeId)}
            onRemove={() => onRemove(compositeId)}
            onClick={() => onCardClick(session.projectId, session.sessionId)}
            onTogglePermission={() => onTogglePermission(compositeId)}
          />
        </div>
      ))}
    </div>
  );
};
