import { Trans } from "@lingui/react";
import type { FC } from "react";

export const CanvasHeader: FC<{
  tabName: string | null;
  sessionCount: number;
}> = ({ tabName, sessionCount }) => {
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
    </div>
  );
};
