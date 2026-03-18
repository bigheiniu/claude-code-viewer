import { PlusIcon } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProjectSession } from "../types";

export const SessionItem: FC<{
  session: ProjectSession;
  projectColor: string;
  isSelected: boolean;
  isInActiveTab: boolean;
  hasActiveTab: boolean;
  onToggle: () => void;
  onAddToTab: () => void;
}> = ({
  session,
  projectColor,
  isSelected,
  isInActiveTab,
  hasActiveTab,
  onToggle,
  onAddToTab,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors w-full text-left",
        isSelected ? "bg-accent/50" : "hover:bg-accent/30",
      )}
      style={
        isSelected
          ? { borderLeft: `2px solid ${projectColor}` }
          : { borderLeft: "2px solid transparent" }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onToggle}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
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
          <span>{session.messageCount} msgs</span>
          {session.lastModifiedAt && (
            <span>{new Date(session.lastModifiedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      {isHovered && hasActiveTab && !isInActiveTab && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-5 px-1.5 text-[9px]"
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
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: projectColor }}
        />
      )}
    </button>
  );
};
