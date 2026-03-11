import { Trans } from "@lingui/react";
import type { FC } from "react";
import type { WorkerView } from "../types";

export const WorkerDetailMeta: FC<{ worker: WorkerView }> = ({ worker }) => {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm mb-4 p-3 rounded-lg bg-muted/50">
      <div>
        <span className="text-muted-foreground">
          <Trans id="workers.detail.meta.project" />:
        </span>{" "}
        <span className="font-mono text-xs">{worker.projectId}</span>
      </div>
      <div>
        <span className="text-muted-foreground">
          <Trans id="workers.detail.meta.session" />:
        </span>{" "}
        <span className="font-mono text-xs">{worker.sessionId ?? "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground">
          <Trans id="workers.detail.meta.process" />:
        </span>{" "}
        <span className="font-mono text-xs">
          {worker.sessionProcessId ?? "—"}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">
          <Trans id="workers.detail.meta.last_activity" />:
        </span>{" "}
        <span className="text-xs">{worker.lastActivityAt ?? "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground">
          <Trans id="workers.detail.meta.created" />:
        </span>{" "}
        <span className="text-xs">{worker.createdAt}</span>
      </div>
      <div>
        <span className="text-muted-foreground">
          <Trans id="workers.detail.meta.updated" />:
        </span>{" "}
        <span className="text-xs">{worker.updatedAt}</span>
      </div>
    </div>
  );
};
