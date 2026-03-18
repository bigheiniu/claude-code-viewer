import { Trans } from "@lingui/react";
import { ChevronsDownUp, ChevronsUpDown, SquareIcon } from "lucide-react";
import { type FC, memo } from "react";
import { Button } from "@/components/ui/button";

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export const CanvasHeader: FC<{
  tabName: string | null;
  sessionCount: number;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  hasExpandedCards?: boolean;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  runningCount?: number;
  onStopAll?: () => void;
  isStoppingAll?: boolean;
  totalCostUsd?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}> = memo(
  ({
    tabName,
    sessionCount,
    onExpandAll,
    onCollapseAll,
    sortBy,
    onSortChange,
    runningCount,
    onStopAll,
    isStoppingAll,
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
  }) => {
    return (
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">
            {tabName ?? <Trans id="session-manager.all-sessions" />}
          </h2>
          <span className="text-xs text-muted-foreground">
            {sessionCount} session{sessionCount !== 1 ? "s" : ""}
          </span>
          {totalCostUsd !== undefined && totalCostUsd > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground border-l border-border pl-3 ml-1">
              <span className="font-mono">${totalCostUsd.toFixed(2)}</span>
              {totalInputTokens !== undefined &&
                totalOutputTokens !== undefined && (
                  <span className="font-mono text-[10px]">
                    {formatTokenCount(totalInputTokens)}↑{" "}
                    {formatTokenCount(totalOutputTokens)}↓
                  </span>
                )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onStopAll && runningCount !== undefined && runningCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onStopAll}
              disabled={isStoppingAll}
            >
              <SquareIcon className="h-3.5 w-3.5 mr-1" />
              Stop All ({runningCount})
            </Button>
          )}
          {onSortChange && (
            <select
              value={sortBy ?? "recent"}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-7 px-2 text-xs bg-transparent border border-border rounded text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="messages">Most Messages</option>
              <option value="name">Name A-Z</option>
            </select>
          )}
          {onExpandAll && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={onExpandAll}
            >
              <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
              Expand All
            </Button>
          )}
          {onCollapseAll && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={onCollapseAll}
            >
              <ChevronsDownUp className="h-3.5 w-3.5 mr-1" />
              Collapse All
            </Button>
          )}
        </div>
      </div>
    );
  },
);
