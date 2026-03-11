import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusColors } from "../constants";
import type { WorkerView } from "../types";

export const WorkerCard: FC<{
  worker: WorkerView;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ worker, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg p-3 transition-colors border",
        isSelected
          ? "bg-accent border-primary/50"
          : "hover:bg-accent/50 border-transparent",
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium truncate">{worker.name}</h3>
        <Badge
          variant="outline"
          className={cn("text-xs", statusColors[worker.status])}
        >
          {worker.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {worker.description}
      </p>
      {worker.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {worker.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-1.5 py-0"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
};
