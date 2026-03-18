import { Trans } from "@lingui/react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";

export const CanvasHeader: FC<{
  tabName: string | null;
  sessionCount: number;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  hasExpandedCards?: boolean;
}> = ({ tabName, sessionCount, onExpandAll, onCollapseAll }) => {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold">
          {tabName ?? <Trans id="session-manager.all-sessions" />}
        </h2>
        <span className="text-xs text-muted-foreground">
          {sessionCount} session{sessionCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-1">
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
};
