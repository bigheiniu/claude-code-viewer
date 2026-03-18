import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { firstUserMessageToTitle } from "@/app/projects/[projectId]/services/firstCommandToTitle";
import { sessionProcessesAtom } from "@/app/projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";
import { projectDetailQuery, projectListQuery } from "@/lib/api/queries";
import type { ProjectSession, ProjectWithSessions } from "../types";
import { getProjectColor, makeCompositeId } from "../utils";

export function useAllProjectSessions(): {
  projects: ProjectWithSessions[];
  isLoading: boolean;
} {
  const { data: projectList } = useSuspenseQuery({
    queryKey: projectListQuery.queryKey,
    queryFn: projectListQuery.queryFn,
  });

  const sessionProcesses = useAtomValue(sessionProcessesAtom);

  // Fetch first page of sessions for each project
  const sessionQueries = useQueries({
    queries: projectList.projects.map((project) => ({
      queryKey: projectDetailQuery(project.id).queryKey,
      queryFn: projectDetailQuery(project.id).queryFn,
    })),
  });

  const isLoading = sessionQueries.some((q) => q.isLoading);

  const projects: ProjectWithSessions[] = projectList.projects
    .map((project, index) => {
      const query = sessionQueries[index];
      if (!query?.data) return null;

      const projectName = project.meta.projectName ?? project.id;
      const projectPath =
        project.meta.projectPath ?? project.claudeProjectPath ?? "";
      const color = getProjectColor(projectPath);

      const sessions: ProjectSession[] = (query.data.sessions ?? []).map(
        (session) => {
          const process = sessionProcesses.find(
            (p) => p.sessionId === session.id,
          );

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
            messageCount: session.meta.messageCount,
            lastModifiedAt: session.lastModifiedAt
              ? new Date(session.lastModifiedAt).toISOString()
              : null,
            firstUserMessage: firstUserMessageText,
            status: process?.status,
            modelName: session.meta.modelName,
            costUsd: session.meta.cost.totalUsd,
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

  return { projects, isLoading };
}
