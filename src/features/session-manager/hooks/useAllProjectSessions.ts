import { useQueries, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { firstUserMessageToTitle } from "@/app/projects/[projectId]/services/firstCommandToTitle";
import { sessionProcessesAtom } from "@/app/projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";
import {
  memoryTitlesQuery,
  projectDetailQuery,
  projectListQuery,
} from "@/lib/api/queries";
import type { ProjectSession, ProjectWithSessions } from "../types";
import { getProjectColor, makeCompositeId } from "../utils";

export function useAllProjectSessions(): {
  projects: ProjectWithSessions[];
  isLoading: boolean;
} {
  const { data: projectList } = useSuspenseQuery({
    queryKey: projectListQuery.queryKey,
    queryFn: projectListQuery.queryFn,
    staleTime: 60 * 1000, // 1 minute - project list rarely changes
  });

  const sessionProcesses = useAtomValue(sessionProcessesAtom);

  // Fetch memory-based session titles for enhanced display
  const memoryTitlesResult = useQuery({
    queryKey: memoryTitlesQuery.queryKey,
    queryFn: memoryTitlesQuery.queryFn,
    staleTime: 5 * 60 * 1000,
  });
  const memoryTitles: Record<string, string> =
    memoryTitlesResult.data?.titles ?? {};

  // Fetch first page of sessions for each project
  const sessionQueries = useQueries({
    queries: projectList.projects.map((project) => ({
      queryKey: ["session-manager", "projects", project.id],
      queryFn: projectDetailQuery(project.id).queryFn,
      staleTime: 30 * 1000, // 30 seconds - SSE will invalidate when needed
    })),
  });

  const isLoading = sessionQueries.some((q) => q.isLoading);

  // Create a stable map of sessionId -> status for O(1) lookups
  const processStatusMap = useMemo(() => {
    const map = new Map<string, "paused" | "running">();
    for (const p of sessionProcesses) {
      if (p.sessionId) {
        map.set(p.sessionId, p.status);
      }
    }
    return map;
  }, [sessionProcesses]);

  const projects: ProjectWithSessions[] = useMemo(() => {
    return projectList.projects
      .map((project, index) => {
        const query = sessionQueries[index];
        if (!query?.data) return null;

        const projectName = project.meta.projectName ?? project.id;
        const projectPath =
          project.meta.projectPath ?? project.claudeProjectPath ?? "";
        const color = getProjectColor(projectPath);

        const sessions: ProjectSession[] = (query.data.sessions ?? []).map(
          (session) => {
            const firstUserMessage = session.meta.firstUserMessage;

            let firstUserMessageText: string | null = null;
            if (firstUserMessage !== null) {
              switch (firstUserMessage.kind) {
                case "text":
                  firstUserMessageText = firstUserMessage.content;
                  break;
                case "command":
                  firstUserMessageText = firstUserMessage.commandArgs
                    ? `${firstUserMessage.commandName} ${firstUserMessage.commandArgs}`
                    : firstUserMessage.commandName;
                  break;
                case "local-command":
                  firstUserMessageText = firstUserMessage.stdout;
                  break;
              }
            }

            return {
              sessionId: session.id,
              compositeId: makeCompositeId(project.id, session.id),
              projectId: project.id,
              title: firstUserMessage
                ? firstUserMessageToTitle(firstUserMessage)
                : session.id,
              memoryTitle: memoryTitles[session.id] ?? null,
              messageCount: session.meta.messageCount,
              lastModifiedAt: session.lastModifiedAt
                ? new Date(session.lastModifiedAt).toISOString()
                : null,
              firstUserMessage: firstUserMessageText,
              status: processStatusMap.get(session.id),
              modelName: session.meta.modelName,
              costUsd: session.meta.cost.totalUsd,
              inputTokens: session.meta.cost.tokenUsage.inputTokens,
              outputTokens: session.meta.cost.tokenUsage.outputTokens,
            };
          },
        );

        return {
          id: project.id,
          name: projectName,
          path: projectPath,
          color,
          sessions,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [projectList.projects, sessionQueries, processStatusMap, memoryTitles]);

  return { projects, isLoading };
}
