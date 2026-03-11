import { Trans } from "@lingui/react";
import { PencilIcon, SquareIcon, Trash2Icon } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusColors } from "../constants";
import type { WorkerView } from "../types";

export const WorkerDetailHeader: FC<{
  worker: WorkerView;
  onEdit: () => void;
  onDelete: () => void;
  onAbort: () => void;
  isAborting: boolean;
}> = ({ worker, onEdit, onDelete, onAbort, isAborting }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold">{worker.name}</h2>
        <p className="text-sm text-muted-foreground">{worker.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("text-xs", statusColors[worker.status])}
        >
          {worker.status}
        </Badge>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2Icon className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onAbort}
          disabled={worker.status !== "running" || isAborting}
        >
          <SquareIcon className="w-3.5 h-3.5 mr-1" />
          <Trans id="workers.detail.abort" />
        </Button>
      </div>
    </div>
  );
};
