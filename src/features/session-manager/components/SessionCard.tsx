import { Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { type FC, memo, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { useSession } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { Loading } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionMode, ProjectSession } from "../types";
import { generateShortTitle } from "../utils";
import { TerminalEmbed } from "./TerminalEmbed";

// --- Collapsed preview card ---
const CollapsedCard: FC<{
  session: ProjectSession;
  projectColor: string;
  projectPath: string;
  permissionMode: PermissionMode;
  onRemove: () => void;
  onExpand: () => void;
  onTogglePermission: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({
  session,
  projectColor,
  projectPath,
  permissionMode,
  onRemove,
  onExpand,
  onTogglePermission,
  onContextMenu,
}) => {
  const isBypass = permissionMode === "bypassPermissions";

  const handleTogglePermission = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (session.status === "running") {
      toast.warning("Permission mode change will take effect on next resume", {
        duration: 3000,
      });
    }
    onTogglePermission();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Card contains nested interactive elements
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card overflow-hidden h-full",
        "transition-all duration-200 hover:shadow-lg hover:border-border",
        "cursor-pointer",
      )}
      onClick={onExpand}
      onContextMenu={onContextMenu}
    >
      <div className="h-0.5" style={{ backgroundColor: projectColor }} />

      <div className="p-3 h-[calc(100%-2px)] flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-semibold font-mono break-words whitespace-normal">
                    {session.memoryTitle ?? generateShortTitle(session.title)}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-xs whitespace-pre-wrap"
                >
                  {session.title}
                </TooltipContent>
              </Tooltip>
              {session.status === "running" && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[9px] bg-green-500/15 text-green-600 dark:text-green-400"
                >
                  Running
                </Badge>
              )}
              {session.status === "paused" && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[9px] bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                >
                  Paused
                </Badge>
              )}
            </div>
            {session.firstUserMessage && (
              <p className="text-[10px] text-muted-foreground break-words whitespace-normal leading-relaxed">
                {session.firstUserMessage}
              </p>
            )}
            <p className="text-[9px] text-muted-foreground/60 font-mono mt-1 break-words whitespace-normal">
              {projectPath}
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-5 w-5 p-0 transition-opacity",
                    isBypass
                      ? "opacity-100 text-orange-500 hover:text-orange-600"
                      : "opacity-0 group-hover:opacity-70 hover:opacity-100 text-muted-foreground",
                  )}
                  onClick={handleTogglePermission}
                >
                  {isBypass ? (
                    <ShieldAlertIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isBypass
                  ? "Bypass permissions (click to switch to default)"
                  : "Default permissions (click to bypass)"}
              </TooltipContent>
            </Tooltip>
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
        </div>

        <div className="flex items-center gap-2 mt-auto pt-2 flex-wrap">
          <Badge
            variant="secondary"
            className="h-4 px-1.5 text-[9px] font-mono"
          >
            {session.messageCount} msgs
          </Badge>
          {isBypass && (
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[9px] font-mono bg-orange-500/10 text-orange-600 dark:text-orange-400"
            >
              skip-perms
            </Badge>
          )}
          {session.modelName && (
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[9px] font-mono"
            >
              {session.modelName.replace(/^claude-/, "").replace(/-\d{8}$/, "")}
            </Badge>
          )}
          {session.costUsd !== undefined && session.costUsd > 0 && (
            <span className="text-[9px] text-muted-foreground font-mono">
              ${session.costUsd.toFixed(2)}
            </span>
          )}
          {session.lastModifiedAt && (
            <span className="text-[9px] text-muted-foreground">
              {new Date(session.lastModifiedAt).toLocaleDateString()}
            </span>
          )}
          <Link
            to="/projects/$projectId/session"
            params={{ projectId: session.projectId }}
            search={{ sessionId: session.sessionId }}
            className="opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-[9px] ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon className="h-3 w-3" />
            Open
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- Right-click context menu popover ---
const SessionContextMenu: FC<{
  session: ProjectSession;
  projectId: string;
  sessionId: string;
  projectPath: string;
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}> = ({
  session,
  projectId,
  sessionId,
  projectPath,
  open,
  position,
  onClose,
}) => {
  if (!open) return null;

  // Clamp menu position to prevent viewport overflow
  const menuWidth = 288;
  const menuHeight = 300;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: menu container */}
      <div
        className="absolute z-50 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3 space-y-3"
        style={{ top: y, left: x }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Session Details
          </p>
          <div className="space-y-1.5">
            <DetailRow label="Session ID" value={sessionId} mono />
            <DetailRow label="Project" value={projectPath} />
            <DetailRow label="Messages" value={String(session.messageCount)} />
            {session.lastModifiedAt && (
              <DetailRow
                label="Last Modified"
                value={new Date(session.lastModifiedAt).toLocaleString()}
              />
            )}
            {session.status && (
              <DetailRow label="Status" value={session.status} />
            )}
          </div>
        </div>
        <Suspense fallback={<Loading />}>
          <MetadataFromSession projectId={projectId} sessionId={sessionId} />
        </Suspense>
      </div>
    </div>
  );
};

const DetailRow: FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <Badge
      variant="secondary"
      className={cn(
        "h-auto py-0.5 text-[10px] break-all whitespace-normal w-fit max-w-full",
        mono && "font-mono",
      )}
    >
      {value}
    </Badge>
  </div>
);

// Fetches full session metadata (model, cost) for the context menu
const MetadataFromSession: FC<{ projectId: string; sessionId: string }> = ({
  projectId,
  sessionId,
}) => {
  const sessionData = useSession(projectId, sessionId);
  if (!sessionData) return null;

  const meta = sessionData.session.meta;
  return (
    <div className="space-y-1.5 pt-2 border-t border-border/40">
      {meta.modelName && (
        <DetailRow label="Model" value={meta.modelName} mono />
      )}
      <DetailRow
        label="Total Cost"
        value={`$${meta.cost.totalUsd.toFixed(3)}`}
      />
      <DetailRow
        label="Input Tokens"
        value={meta.cost.tokenUsage.inputTokens.toLocaleString()}
      />
      <DetailRow
        label="Output Tokens"
        value={meta.cost.tokenUsage.outputTokens.toLocaleString()}
      />
    </div>
  );
};

// --- Error fallback for expanded cards ---
const CardErrorFallback: FC<{
  error: unknown;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-3">
      <AlertCircleIcon className="h-8 w-8 text-destructive/60" />
      <div>
        <p className="text-xs font-semibold text-destructive mb-1">
          Failed to load session
        </p>
        <p className="text-[10px] text-muted-foreground break-all">{message}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs gap-1.5"
        onClick={resetErrorBoundary}
      >
        <RefreshCwIcon className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
};

// --- Main SessionCard component ---
export const SessionCard: FC<{
  session: ProjectSession;
  projectColor: string;
  projectPath: string;
  permissionMode: PermissionMode;
  isExpanded: boolean;
  onRemove: () => void;
  onToggleExpand: () => void;
  onTogglePermission: () => void;
}> = memo(
  ({
    session,
    projectColor,
    projectPath,
    permissionMode,
    isExpanded,
    onRemove,
    onToggleExpand,
    onTogglePermission,
  }) => {
    const [contextMenu, setContextMenu] = useState<{
      open: boolean;
      x: number;
      y: number;
    }>({ open: false, x: 0, y: 0 });

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ open: true, x: e.clientX, y: e.clientY });
    };

    if (!isExpanded) {
      return (
        <>
          <CollapsedCard
            session={session}
            projectColor={projectColor}
            projectPath={projectPath}
            permissionMode={permissionMode}
            onRemove={onRemove}
            onExpand={onToggleExpand}
            onTogglePermission={onTogglePermission}
            onContextMenu={handleContextMenu}
          />
          <SessionContextMenu
            session={session}
            projectId={session.projectId}
            sessionId={session.sessionId}
            projectPath={projectPath}
            open={contextMenu.open}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu((p) => ({ ...p, open: false }))}
          />
        </>
      );
    }

    // Expanded: full inline chat card
    return (
      <>
        <div
          className="relative rounded-xl border border-border bg-card overflow-hidden h-full flex flex-col"
          onContextMenu={handleContextMenu}
        >
          <div className="h-0.5" style={{ backgroundColor: projectColor }} />

          {/* Compact header */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/40 bg-muted/30 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-semibold truncate flex-1">
                  {session.memoryTitle ?? generateShortTitle(session.title)}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-xs whitespace-pre-wrap"
              >
                {session.title}
              </TooltipContent>
            </Tooltip>
            {session.status === "running" && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            )}
            <Link
              to="/projects/$projectId/session"
              params={{ projectId: session.projectId }}
              search={{ sessionId: session.sessionId }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-[9px] transition-colors"
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Open
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleExpand}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>

          {/* Terminal */}
          <div className="flex-1 min-h-0 bg-[#0a0a0a]">
            <ErrorBoundary FallbackComponent={CardErrorFallback}>
              <TerminalEmbed
                cwd={projectPath}
                claudeSessionId={session.sessionId}
              />
            </ErrorBoundary>
          </div>
        </div>
        <SessionContextMenu
          session={session}
          projectId={session.projectId}
          sessionId={session.sessionId}
          projectPath={projectPath}
          open={contextMenu.open}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu((p) => ({ ...p, open: false }))}
        />
      </>
    );
  },
);
