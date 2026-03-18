import { PlusIcon, XIcon } from "lucide-react";
import { type FC, memo, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SessionManagerTab } from "../types";

export const TabBar: FC<{
  tabs: SessionManagerTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabCreate: (name: string) => void;
  onTabRename?: (tabId: string, newName: string) => void;
}> = memo(
  ({ tabs, activeTabId, onTabClick, onTabClose, onTabCreate, onTabRename }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newTabName, setNewTabName] = useState("");
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isCreating && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isCreating]);

    useEffect(() => {
      if (renamingTabId && renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, [renamingTabId]);

    const handleCreate = () => {
      const trimmedName = newTabName.trim();
      const finalName = trimmedName || `Tab ${tabs.length + 1}`;
      onTabCreate(finalName);
      setNewTabName("");
      setIsCreating(false);
    };

    const handleRename = (tabId: string) => {
      const trimmedName = renameValue.trim();
      if (trimmedName && onTabRename) {
        onTabRename(tabId, trimmedName);
      }
      setRenamingTabId(null);
      setRenameValue("");
    };

    const startRenaming = (tabId: string, currentName: string) => {
      setRenamingTabId(tabId);
      setRenameValue(currentName);
    };

    const handleTabClose = (tabId: string, tabName: string) => {
      const confirmed = window.confirm(
        `Close tab '${tabName}'? Sessions will be removed from this tab.`,
      );
      if (confirmed) {
        onTabClose(tabId);
      }
    };

    return (
      <div className="flex flex-nowrap items-end border-b border-border bg-muted/30 h-10 px-4 gap-0.5 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isRenaming = renamingTabId === tab.id;
          return (
            <div
              key={tab.id}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-t-md transition-colors text-xs",
                isActive
                  ? "bg-background border-b-2 border-primary font-semibold"
                  : "text-muted-foreground hover:bg-background/50",
              )}
            >
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                onClick={() => onTabClick(tab.id)}
                onDoubleClick={() => startRenaming(tab.id, tab.name)}
              >
                {isRenaming ? (
                  <Input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        handleRename(tab.id);
                      }
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setRenamingTabId(null);
                        setRenameValue("");
                      }
                    }}
                    onBlur={() => handleRename(tab.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-20 text-xs px-1"
                  />
                ) : (
                  <span>{tab.name}</span>
                )}
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-[9px] font-mono"
                >
                  {tab.sessionIds.length}
                </Badge>
              </button>
              <button
                type="button"
                className={cn(
                  "h-5 w-5 rounded-sm flex items-center justify-center transition-opacity mr-1.5",
                  isActive
                    ? "opacity-70 hover:opacity-100"
                    : "opacity-50 hover:opacity-70",
                )}
                onClick={() => handleTabClose(tab.id, tab.name)}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {isCreating ? (
          <div className="flex items-center gap-1 px-2 py-1">
            <Input
              ref={inputRef}
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setIsCreating(false);
              }}
              placeholder="Tab name..."
              className="h-6 w-24 text-xs"
            />
            <Button
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCreate}
            >
              Add
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsCreating(true)}
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
