import { CheckIcon, EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";
import { type FC, memo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProjectSession } from "../types";

export const SessionItem: FC<{
  session: ProjectSession;
  projectColor: string;
  isSelected: boolean;
  isInActiveTab: boolean;
  isHidden: boolean;
  hasActiveTab: boolean;
  onToggle: () => void;
  onAddToTab: () => void;
  onToggleHide: () => void;
}> = memo(
  ({
    session,
    projectColor,
    isSelected,
    isInActiveTab,
    isHidden,
    hasActiveTab,
    onToggle,
    onAddToTab,
    onToggleHide,
  }) => {
    return (
      <button
        type="button"
        className={cn(
          "group relative flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors w-full text-left",
          isHidden && "opacity-50",
          isSelected
            ? "bg-accent/50"
            : isInActiveTab
              ? "bg-accent/20"
              : "hover:bg-accent/30",
        )}
        style={
          isSelected
            ? { borderLeft: `2px solid ${projectColor}` }
            : { borderLeft: "2px solid transparent" }
        }
        onClick={onToggle}
      >
        <Checkbox
          checked={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="h-3.5 w-3.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate font-mono">
              {session.title}
            </span>
            {session.status === "running" && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            )}
            {session.status === "paused" && (
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            {session.status === "running" && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Running
              </span>
            )}
            {session.status === "paused" && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                Paused
              </span>
            )}
            <span>{session.messageCount} msgs</span>
            {session.lastModifiedAt && (
              <span>
                {new Date(session.lastModifiedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {hasActiveTab && !isInActiveTab && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-5 px-1.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddToTab();
            }}
          >
            <PlusIcon className="h-3 w-3 mr-0.5" />
            Tab
          </Button>
        )}
        {isInActiveTab && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `${projectColor}20`,
              color: projectColor,
            }}
          >
            <CheckIcon className="h-2.5 w-2.5" />
            Tab
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-1 h-5 px-1.5 text-[9px] transition-opacity",
            hasActiveTab && !isInActiveTab ? "top-7" : "top-1",
            isHidden
              ? "opacity-70 text-muted-foreground"
              : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHide();
          }}
        >
          {isHidden ? (
            <>
              <EyeIcon className="h-3 w-3 mr-0.5" />
              Show
            </>
          ) : (
            <>
              <EyeOffIcon className="h-3 w-3 mr-0.5" />
              Hide
            </>
          )}
        </Button>
      </button>
    );
  },
);
