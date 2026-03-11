import { Trans } from "@lingui/react";
import { BotIcon, PlusIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import type { WorkerView } from "../types";
import { WorkerCard } from "./WorkerCard";

export const WorkerList: FC<{
  workers: WorkerView[];
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
  onCreateWorker: () => void;
}> = ({ workers, selectedWorkerId, onSelectWorker, onCreateWorker }) => {
  return (
    <div className="h-full flex flex-col border-r">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">
          <Trans id="workers.page.title" />
        </h2>
        <Button size="sm" onClick={onCreateWorker}>
          <PlusIcon className="w-4 h-4 mr-1" />
          <Trans id="workers.list.new_worker" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BotIcon className="w-10 h-10 mb-3" />
            <p className="text-sm">
              <Trans id="workers.list.empty" />
            </p>
          </div>
        ) : (
          workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              isSelected={worker.id === selectedWorkerId}
              onSelect={() => onSelectWorker(worker.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
