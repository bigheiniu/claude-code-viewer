import { Trans } from "@lingui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { type FC, Suspense, useCallback, useState } from "react";
import { workerListQuery } from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";
import type { WorkerFormData } from "./components/CreateWorkerDialog";
import { CreateWorkerDialog } from "./components/CreateWorkerDialog";
import { TopNav } from "./components/TopNav";
import { WorkerDetail } from "./components/WorkerDetail";
import { WorkerList } from "./components/WorkerList";
import {
  useAbortWorker,
  useCreateWorker,
  useDeleteWorker,
  useSendMessage,
  useUpdateWorker,
} from "./hooks/useWorkerMutations";
import { useWorkers } from "./hooks/useWorkers";
import type { WorkerView } from "./types";

const WorkersContent: FC = () => {
  const { data } = useWorkers();
  const workers = data.workers;
  const navigate = useNavigate();

  // Selected worker ID stored in URL search params for shareability
  const { workerId: selectedWorkerId } = useSearch({ from: "/workers/" });

  const setSelectedWorkerId = useCallback(
    (id: string | null) => {
      void navigate({
        to: "/workers",
        search: id ? { workerId: id } : {},
      });
    },
    [navigate],
  );

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerView | undefined>(
    undefined,
  );

  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const deleteWorker = useDeleteWorker();
  const sendMessage = useSendMessage();
  const abortWorker = useAbortWorker();

  const queryClient = useQueryClient();

  // SSE: invalidate workers on session process changes
  useServerEventListener("sessionProcessChanged", () => {
    void queryClient.invalidateQueries({
      queryKey: workerListQuery.queryKey,
    });
  });

  const selectedWorker = selectedWorkerId
    ? (workers.find((w: WorkerView) => w.id === selectedWorkerId) ?? null)
    : null;

  const handleCreateSubmit = (formData: WorkerFormData) => {
    const tags = formData.tags
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    if (editingWorker) {
      updateWorker.mutate(
        {
          workerId: editingWorker.id,
          input: {
            name: formData.name,
            description: formData.description,
            tags,
            sessionId: formData.sessionId || null,
            sessionProcessId: formData.sessionProcessId || null,
          },
        },
        {
          onSuccess: () => {
            setCreateDialogOpen(false);
            setEditingWorker(undefined);
          },
        },
      );
    } else {
      createWorker.mutate(
        {
          name: formData.name,
          description: formData.description,
          projectId: formData.projectId,
          sessionId: formData.sessionId || null,
          sessionProcessId: formData.sessionProcessId || null,
          tags,
        },
        {
          onSuccess: () => {
            setCreateDialogOpen(false);
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (!selectedWorker) return;
    // Note: window.confirm cannot use <Trans>; this is acceptable for Phase 1.
    // A future enhancement could replace this with a custom confirmation dialog.
    if (!window.confirm("Are you sure you want to delete this worker?")) return;
    deleteWorker.mutate(selectedWorker.id, {
      onSuccess: () => {
        void navigate({ to: "/workers", search: {} });
      },
    });
  };

  const handleEdit = () => {
    if (!selectedWorker) return;
    setEditingWorker(selectedWorker);
    setCreateDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 flex-shrink-0">
          <WorkerList
            workers={workers}
            selectedWorkerId={selectedWorkerId ?? null}
            onSelectWorker={setSelectedWorkerId}
            onCreateWorker={() => {
              setEditingWorker(undefined);
              setCreateDialogOpen(true);
            }}
          />
        </div>

        <div className="flex-1 overflow-auto">
          {selectedWorker ? (
            <WorkerDetail
              worker={selectedWorker}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAbort={() => abortWorker.mutate(selectedWorker.id)}
              onSendMessage={(message) =>
                sendMessage.mutate({ workerId: selectedWorker.id, message })
              }
              isAborting={abortWorker.isPending}
              isSending={sendMessage.isPending}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">
                <Trans id="workers.detail.select_prompt" />
              </p>
            </div>
          )}
        </div>
      </div>

      <CreateWorkerDialog
        key={editingWorker?.id ?? "create"}
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingWorker(undefined);
        }}
        onSubmit={handleCreateSubmit}
        isPending={createWorker.isPending || updateWorker.isPending}
        initialData={editingWorker}
      />
    </>
  );
};

export const WorkersPage: FC = () => {
  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden">
      <TopNav />
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1">
            <div className="text-muted-foreground">
              <Trans id="workers.page.loading" />
            </div>
          </div>
        }
      >
        <WorkersContent />
      </Suspense>
    </div>
  );
};
