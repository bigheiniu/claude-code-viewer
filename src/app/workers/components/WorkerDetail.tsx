import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import type { WorkerView } from "../types";
import { WorkerDetailHeader } from "./WorkerDetailHeader";
import { WorkerDetailMeta } from "./WorkerDetailMeta";
import { WorkerMessageInput } from "./WorkerMessageInput";

export const WorkerDetail: FC<{
  worker: WorkerView;
  onEdit: () => void;
  onDelete: () => void;
  onAbort: () => void;
  onSendMessage: (message: string) => void;
  isAborting: boolean;
  isSending: boolean;
}> = ({
  worker,
  onEdit,
  onDelete,
  onAbort,
  onSendMessage,
  isAborting,
  isSending,
}) => {
  return (
    <div className="h-full flex flex-col p-4">
      <WorkerDetailHeader
        worker={worker}
        onEdit={onEdit}
        onDelete={onDelete}
        onAbort={onAbort}
        isAborting={isAborting}
      />

      {worker.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-4">
          {worker.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <WorkerDetailMeta worker={worker} />

      <div className="flex-1" />

      <WorkerMessageInput
        onSend={onSendMessage}
        disabled={worker.status !== "paused"}
        isPending={isSending}
      />
    </div>
  );
};
