import { ShieldAlertIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionMode, ProjectSession } from "../types";

export const SessionCard: FC<{
  session: ProjectSession;
  projectColor: string;
  projectPath: string;
  permissionMode: PermissionMode;
  onRemove: () => void;
  onClick: () => void;
  onTogglePermission: () => void;
}> = ({
  session,
  projectColor,
  projectPath,
  permissionMode,
  onRemove,
  onClick,
  onTogglePermission,
}) => {
  const isBypass = permissionMode === "bypassPermissions";

  const handleTogglePermission = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (session.status === "running") {
      toast.warning("Permission mode change will take effect on next resume", {
        duration: 3000,
      });
    }
    onTogglePermission();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Card contains nested interactive elements, cannot be a button
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card overflow-hidden",
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-border",
        "cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="h-0.5" style={{ backgroundColor: projectColor }} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-semibold font-mono truncate">
                {session.title}
              </span>
              {session.status === "running" && (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              )}
              {session.status === "paused" && (
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
              )}
            </div>
            {session.firstUserMessage && (
              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                {session.firstUserMessage}
              </p>
            )}
            <p className="text-[9px] text-muted-foreground/60 font-mono mt-1 truncate">
              {projectPath}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-5 w-5 p-0 transition-opacity",
                    isBypass
                      ? "opacity-100 text-orange-500 hover:text-orange-600"
                      : "opacity-0 group-hover:opacity-70 hover:opacity-100 text-muted-foreground",
                  )}
                  onClick={handleTogglePermission}
                >
                  {isBypass ? (
                    <ShieldAlertIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isBypass
                  ? "Bypass permissions (click to switch to default)"
                  : "Default permissions (click to bypass)"}
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge
            variant="secondary"
            className="h-4 px-1.5 text-[9px] font-mono"
          >
            {session.messageCount} msgs
          </Badge>
          {isBypass && (
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[9px] font-mono bg-orange-500/10 text-orange-600 dark:text-orange-400"
            >
              skip-perms
            </Badge>
          )}
          {session.lastModifiedAt && (
            <span className="text-[9px] text-muted-foreground">
              {new Date(session.lastModifiedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
