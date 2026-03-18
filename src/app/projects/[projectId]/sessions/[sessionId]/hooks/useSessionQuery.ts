import { useSuspenseQuery } from "@tanstack/react-query";
import { sessionDetailQuery } from "../../../../../../lib/api/queries";

export const useSessionQuery = (
  projectId: string,
  sessionId: string,
  options?: { isRunning?: boolean },
) => {
  return useSuspenseQuery({
    queryKey: sessionDetailQuery(projectId, sessionId).queryKey,
    queryFn: sessionDetailQuery(projectId, sessionId).queryFn,
    // When options is provided, only poll for running sessions to avoid
    // excessive requests when many cards are expanded simultaneously.
    // When options is not provided (default), always poll as a fallback
    // in case the SSE connection is lost.
    refetchInterval: options === undefined || options.isRunning ? 3000 : false,
    refetchIntervalInBackground: false,
  });
};
