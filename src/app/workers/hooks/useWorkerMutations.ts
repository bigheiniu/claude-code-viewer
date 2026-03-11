import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { honoClient } from "@/lib/api/client";
import { workerListQuery } from "@/lib/api/queries";

export const useCreateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      projectId: string;
      sessionId?: string | null;
      sessionProcessId?: string | null;
      tags?: string[];
    }) => {
      const response = await honoClient.api.workers.$post({
        json: {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          sessionId: input.sessionId ?? null,
          sessionProcessId: input.sessionProcessId ?? null,
          tags: input.tags ?? [],
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create worker");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workerListQuery.queryKey,
      });
      toast.success("Worker created");
    },
    onError: () => {
      toast.error("Failed to create worker");
    },
  });
};

export const useUpdateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workerId,
      input,
    }: {
      workerId: string;
      input: {
        name?: string;
        description?: string;
        tags?: string[];
        sessionId?: string | null;
        sessionProcessId?: string | null;
      };
    }) => {
      const response = await honoClient.api.workers[":id"].$put({
        param: { id: workerId },
        json: input,
      });

      if (!response.ok) {
        throw new Error("Failed to update worker");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workerListQuery.queryKey,
      });
      toast.success("Worker updated");
    },
    onError: () => {
      toast.error("Failed to update worker");
    },
  });
};

export const useDeleteWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const response = await honoClient.api.workers[":id"].$delete({
        param: { id: workerId },
      });

      if (!response.ok) {
        throw new Error("Failed to delete worker");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workerListQuery.queryKey,
      });
      toast.success("Worker deleted");
    },
    onError: () => {
      toast.error("Failed to delete worker");
    },
  });
};

export const useSendMessage = () => {
  return useMutation({
    mutationFn: async ({
      workerId,
      message,
    }: {
      workerId: string;
      message: string;
    }) => {
      const response = await honoClient.api.workers[":id"].message.$post({
        param: { id: workerId },
        json: { message },
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Message sent");
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });
};

export const useAbortWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const response = await honoClient.api.workers[":id"].abort.$post({
        param: { id: workerId },
      });

      if (!response.ok) {
        throw new Error("Failed to abort worker");
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workerListQuery.queryKey,
      });
      toast.success("Worker aborted");
    },
    onError: () => {
      toast.error("Failed to abort worker");
    },
  });
};
