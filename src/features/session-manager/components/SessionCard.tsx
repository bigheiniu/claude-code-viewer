import { Trans } from "@lingui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  LoaderIcon,
  RefreshCwIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { type FC, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { ConversationList } from "@/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/ConversationList";
import { ContinueChat } from "@/app/projects/[projectId]/sessions/[sessionId]/components/resumeChat/ContinueChat";
import { useSession } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { useSessionProcess } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSessionProcess";
import { Loading } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { honoClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { PermissionMode, ProjectSession } from "../types";
import { generateShortTitle } from "../utils";

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

// --- Inline resume chat (no navigation on success) ---
const InlineResumeChat: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const resumeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await honoClient.api["claude-code"][
        "session-processes"
      ].$post(
        {
          json: {
            projectId,
            baseSession: { type: "resume", sessionId },
            input: { text },
          },
        },
        { init: { signal: AbortSignal.timeout(60 * 1000) } },
      );
      if (!response.ok) throw new Error(response.statusText);
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      // Invalidate session query to refresh conversation list immediately
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "sessions", sessionId],
      });
    },
    onError: (error) => {
      toast.error(
        `Failed to resume session: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });

  const handleSubmit = () => {
    const text = message.trim();
    if (!text || resumeMutation.isPending) return;
    resumeMutation.mutate(text);
  };

  return (
    <div className="flex items-end gap-1.5 p-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Resume session..."
        className="min-h-[32px] max-h-[80px] text-xs resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
        onClick={handleSubmit}
        disabled={!message.trim() || resumeMutation.isPending}
      >
        {resumeMutation.isPending ? (
          <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <SendIcon className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
};

// --- Expanded inline chat content (loaded via Suspense) ---
const ExpandedChatContent: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const sessionData = useSession(projectId, sessionId);
  const { getSessionProcess } = useSessionProcess();
  const relatedProcess = useMemo(
    () => getSessionProcess(sessionId),
    [getSessionProcess, sessionId],
  );
  const rawConversations = sessionData?.conversations ?? [];
  const getToolResult = sessionData?.getToolResult ?? (() => undefined);

  // Filter out consecutive duplicate file-history-snapshot entries to reduce clutter.
  // From each consecutive group, only the last entry is kept.
  const conversations = useMemo(() => {
    return rawConversations.filter((entry, index) => {
      if (!("type" in entry) || entry.type !== "file-history-snapshot") {
        return true;
      }
      const next = rawConversations[index + 1];
      // Keep this snapshot only if the next entry is NOT also a file-history-snapshot
      return !(next && "type" in next && next.type === "file-history-snapshot");
    });
  }, [rawConversations]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledOnMount = useRef(false);
  const [prevLength, setPrevLength] = useState(0);

  const isRunning = relatedProcess?.status === "running";

  const abortTask = useMutation({
    mutationFn: async (sessionProcessId: string) => {
      const response = await honoClient.api["claude-code"]["session-processes"][
        ":sessionProcessId"
      ].abort.$post({
        param: { sessionProcessId },
        json: { projectId },
      });
      if (!response.ok) throw new Error(response.statusText);
      return response.json();
    },
  });

  // Scroll to bottom on initial mount so the user sees the most recent messages
  useEffect(() => {
    if (hasScrolledOnMount.current) return;
    if (conversations.length === 0) return;
    hasScrolledOnMount.current = true;
    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight });
      }
    });
  }, [conversations.length]);

  // Auto-scroll on new messages while running, but only if user is near bottom
  useEffect(() => {
    if (isRunning && conversations.length !== prevLength) {
      setPrevLength(conversations.length);
      const el = scrollContainerRef.current;
      if (el) {
        const isNearBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (isNearBottom) {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
      }
    }
  }, [conversations.length, isRunning, prevLength]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Inline status bar */}
      {isRunning && relatedProcess && (
        <div className="flex items-center gap-2 px-2 py-1 bg-green-500/5 border-b border-border/30">
          <LoaderIcon className="w-3 h-3 animate-spin text-green-500" />
          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
            <Trans id="session.status.running" />
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] ml-auto text-destructive hover:text-destructive"
            onClick={() => abortTask.mutate(relatedProcess.id)}
            disabled={abortTask.isPending}
          >
            <Trans id="session.conversation.abort" />
          </Button>
        </div>
      )}

      {/* Scrollable conversation */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 px-2"
      >
        <ConversationList
          conversations={conversations}
          getToolResult={getToolResult}
          projectId={projectId}
          sessionId={sessionId}
          scheduledJobs={[]}
        />
        {isRunning && (
          <div className="flex items-center gap-2 py-3">
            <LoaderIcon className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground animate-pulse">
              <Trans id="session.processing" />
            </span>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 border-t border-border/30 bg-background/95">
        {relatedProcess ? (
          <ContinueChat
            projectId={projectId}
            sessionId={sessionId}
            sessionProcessId={relatedProcess.id}
            sessionProcessStatus={relatedProcess.status}
          />
        ) : (
          <InlineResumeChat projectId={projectId} sessionId={sessionId} />
        )}
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
}> = ({
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

        {/* Inline chat */}
        <div className="flex-1 min-h-0">
          <ErrorBoundary FallbackComponent={CardErrorFallback}>
            <Suspense fallback={<Loading />}>
              <ExpandedChatContent
                projectId={session.projectId}
                sessionId={session.sessionId}
              />
            </Suspense>
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
};
