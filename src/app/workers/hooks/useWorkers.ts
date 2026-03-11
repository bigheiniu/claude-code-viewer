import { useSuspenseQuery } from "@tanstack/react-query";
import { workerListQuery } from "../../../lib/api/queries";

export const useWorkers = () => {
  return useSuspenseQuery({
    queryKey: workerListQuery.queryKey,
    queryFn: workerListQuery.queryFn,
  });
};
