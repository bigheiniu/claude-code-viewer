import { TerminalSquareIcon, XIcon } from "lucide-react";
import { type FC, memo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import type { NewSessionCard } from "../types";
import { TerminalEmbed } from "./TerminalEmbed";

const CardErrorFallback: FC<{
  error: unknown;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-3">
      <p className="text-xs font-semibold text-destructive mb-1">
        Failed to start session
      </p>
      <p className="text-[10px] text-muted-foreground break-all">{message}</p>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={resetErrorBoundary}
      >
        Retry
      </Button>
    </div>
  );
};

export const NewSessionTerminalCard: FC<{
  card: NewSessionCard;
  isExpanded: boolean;
  onRemove: () => void;
  onToggleExpand: () => void;
}> = memo(({ card, isExpanded, onRemove, onToggleExpand }) => {
  if (!isExpanded) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: Card click to expand
      <div
        className="group relative rounded-xl border border-border/50 bg-card overflow-hidden h-full transition-all duration-200 hover:shadow-lg hover:border-border cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="h-0.5" style={{ backgroundColor: card.projectColor }} />
        <div className="p-3 h-[calc(100%-2px)] flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-xs font-semibold font-mono">
                  New Session
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {card.projectName}
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-mono mt-1">
                {card.projectPath}
              </p>
            </div>
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
          <div className="flex items-center gap-2 mt-auto pt-2">
            <TerminalSquareIcon className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">
              Click to start terminal
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden h-full flex flex-col">
      <div className="h-0.5" style={{ backgroundColor: card.projectColor }} />
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/40 bg-muted/30 flex-shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <span className="text-[10px] font-semibold truncate flex-1">
          New Session — {card.projectName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
        >
          <XIcon className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 bg-[#0a0a0a]">
        <ErrorBoundary FallbackComponent={CardErrorFallback}>
          <TerminalEmbed cwd={card.projectPath} />
        </ErrorBoundary>
      </div>
    </div>
  );
});
