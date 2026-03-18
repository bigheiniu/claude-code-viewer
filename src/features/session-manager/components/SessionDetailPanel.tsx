import { Trans } from "@lingui/react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  LoaderIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { type FC, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/app/hooks/useConfig";
import { firstUserMessageToTitle } from "@/app/projects/[projectId]/services/firstCommandToTitle";
import { ConversationList } from "@/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/ConversationList";
import { ContinueChat } from "@/app/projects/[projectId]/sessions/[sessionId]/components/resumeChat/ContinueChat";
import { ResumeChat } from "@/app/projects/[projectId]/sessions/[sessionId]/components/resumeChat/ResumeChat";
import { getSessionStatusBadgeProps } from "@/app/projects/[projectId]/sessions/[sessionId]/components/sessionStatusBadge";
import { useSession } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { useSessionProcess } from "@/app/projects/[projectId]/sessions/[sessionId]/hooks/useSessionProcess";
import { Loading } from "@/components/Loading";
import { PermissionDialog } from "@/components/PermissionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissionRequests } from "@/hooks/usePermissionRequests";
import { honoClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { parseUserMessage } from "@/server/core/claude-code/functions/parseUserMessage";
import type { PermissionMode } from "../types";

const SessionDetailContent: FC<{
  projectId: string;
  sessionId: string;
  permissionMode: PermissionMode;
  onBack: () => void;
  onTogglePermission: () => void;
}> = ({ projectId, sessionId, permissionMode, onBack, onTogglePermission }) => {
  const sessionData = useSession(projectId, sessionId);
  const { getSessionProcess } = useSessionProcess();
  const relatedProcess = useMemo(
    () => getSessionProcess(sessionId),
    [getSessionProcess, sessionId],
  );
  const conversations = sessionData?.conversations ?? [];
  const getToolResult = sessionData?.getToolResult ?? (() => undefined);
  const { config, updateConfig } = useConfig();
  const { currentPermissionRequest, isDialogOpen, onPermissionResponse } =
    usePermissionRequests();

  const hasLocalCommandOutput = useMemo(
    () =>
      conversations.some((conversation) => {
        if (conversation.type !== "user") return false;
        if (typeof conversation.message.content !== "string") return false;
        return (
          parseUserMessage(conversation.message.content).kind ===
          "local-command"
        );
      }),
    [conversations],
  );

  const effectiveSessionStatus =
    relatedProcess?.status === "running" && hasLocalCommandOutput
      ? "paused"
      : relatedProcess?.status;

  const statusBadge = getSessionStatusBadgeProps(effectiveSessionStatus);

  const sessionTitle =
    sessionData?.session.meta.firstUserMessage != null
      ? firstUserMessageToTitle(sessionData.session.meta.firstUserMessage)
      : sessionId;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);

  const abortTask = useMutation({
    mutationFn: async (sessionProcessId: string) => {
      const response = await honoClient.api["claude-code"]["session-processes"][
        ":sessionProcessId"
      ].abort.$post({
        param: { sessionProcessId },
        json: { projectId },
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
  });

  // Auto-scroll when running and new conversation entries appear
  useEffect(() => {
    if (
      effectiveSessionStatus === "running" &&
      conversations.length !== previousConversationLength
    ) {
      setPreviousConversationLength(conversations.length);
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [conversations, effectiveSessionStatus, previousConversationLength]);

  type ConfigPermissionMode =
    | "acceptEdits"
    | "bypassPermissions"
    | "default"
    | "plan";

  // Apply permission mode override when entering this panel
  const prevPermissionModeRef = useRef<ConfigPermissionMode | null>(null);

  useEffect(() => {
    if (prevPermissionModeRef.current === null) {
      prevPermissionModeRef.current = config.permissionMode ?? "default";
    }

    const targetMode: ConfigPermissionMode =
      permissionMode === "bypassPermissions"
        ? "bypassPermissions"
        : (prevPermissionModeRef.current ?? "default");

    if (config.permissionMode !== targetMode) {
      updateConfig({
        ...config,
        permissionMode: targetMode,
      });
    }
  }, [permissionMode, config, updateConfig]); // Only re-run when permissionMode prop changes

  const isBypass = permissionMode === "bypassPermissions";

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button, title, status, permission toggle */}
      <header className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex-shrink-0"
          onClick={onBack}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{sessionTitle}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {statusBadge && (
            <Badge
              variant="secondary"
              className={cn("h-5 text-[10px] px-1.5", statusBadge.className)}
            >
              {statusBadge.icon === "running" ? (
                <LoaderIcon className="w-2.5 h-2.5 mr-0.5 animate-spin" />
              ) : null}
              <Trans id={statusBadge.labelId} />
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0",
                  isBypass
                    ? "text-orange-500 hover:text-orange-600"
                    : "text-muted-foreground",
                )}
                onClick={onTogglePermission}
              >
                {isBypass ? (
                  <ShieldAlertIcon className="h-4 w-4" />
                ) : (
                  <ShieldCheckIcon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isBypass
                ? "Bypass permissions active (click to use default)"
                : "Default permissions (click to bypass)"}
            </TooltipContent>
          </Tooltip>
          {effectiveSessionStatus === "running" && relatedProcess && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => abortTask.mutate(relatedProcess.id)}
              disabled={abortTask.isPending}
            >
              {abortTask.isPending ? (
                <LoaderIcon className="w-3 h-3 animate-spin" />
              ) : (
                <Trans id="session.conversation.abort" />
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Scroll controls */}
      <div className="flex items-center gap-1 px-4 py-1 border-b border-border/40 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={handleScrollToTop}
        >
          <Trans id="control.scroll_to_top" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={handleScrollToBottom}
        >
          <Trans id="control.scroll_to_bottom" />
        </Button>
        {isBypass && (
          <Badge
            variant="secondary"
            className="ml-auto h-5 text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400"
          >
            skip-permissions
          </Badge>
        )}
      </div>

      {/* Conversation content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 sm:px-6 md:px-8">
          <ConversationList
            conversations={conversations}
            getToolResult={getToolResult}
            projectId={projectId}
            sessionId={sessionId}
            scheduledJobs={[]}
          />
          {effectiveSessionStatus === "running" && (
            <div className="flex justify-start items-center py-8 animate-in fade-in duration-500">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
                <p className="text-sm text-muted-foreground font-medium animate-pulse">
                  <Trans id="session.processing" />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {relatedProcess ? (
          <ContinueChat
            projectId={projectId}
            sessionId={sessionId}
            sessionProcessId={relatedProcess.id}
            sessionProcessStatus={effectiveSessionStatus}
          />
        ) : (
          <ResumeChat projectId={projectId} sessionId={sessionId} />
        )}
      </div>

      {/* Permission dialog for tool approvals */}
      <PermissionDialog
        permissionRequest={currentPermissionRequest}
        isOpen={isDialogOpen}
        onResponse={onPermissionResponse}
      />
    </div>
  );
};

export const SessionDetailPanel: FC<{
  projectId: string;
  sessionId: string;
  permissionMode: PermissionMode;
  onBack: () => void;
  onTogglePermission: () => void;
}> = (props) => {
  return (
    <Suspense fallback={<Loading />}>
      <SessionDetailContent {...props} />
    </Suspense>
  );
};
