import { Trans } from "@lingui/react";
import { GripHorizontal, HexagonIcon } from "lucide-react";
import { type FC, useCallback, useMemo } from "react";
import {
  type Layout,
  type LayoutItem,
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "./session-grid.css";
import type {
  GridLayoutItem,
  NewSessionCard,
  PermissionMode,
  ProjectSession,
  ProjectWithSessions,
} from "../types";
import { NewSessionTerminalCard } from "./NewSessionTerminalCard";
import { SessionCard } from "./SessionCard";

const COLS = { lg: 4, md: 3, sm: 2, xs: 1 };
const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const ROW_HEIGHT = 55;
const COLLAPSED_H = 2;
const EXPANDED_H = 8;

function generateDefaultLayout(
  sessionIds: string[],
  expandedCards: Set<string>,
  cols: number,
): GridLayoutItem[] {
  return sessionIds.map((id, idx) => {
    const isExpanded = expandedCards.has(id);
    return {
      i: id,
      x: idx % cols,
      y: Math.floor(idx / cols) * COLLAPSED_H,
      w: 1,
      h: isExpanded ? EXPANDED_H : COLLAPSED_H,
      minW: 1,
      minH: isExpanded ? 4 : 2,
    };
  });
}

export const SessionGrid: FC<{
  sessionIds: string[];
  projects: ProjectWithSessions[];
  expandedCards: Set<string>;
  savedLayout: GridLayoutItem[] | undefined;
  newSessionCards?: NewSessionCard[];
  onRemove: (compositeId: string) => void;
  onToggleExpand: (compositeId: string) => void;
  onLayoutChange: (layout: GridLayoutItem[]) => void;
  getPermissionMode: (compositeId: string) => PermissionMode;
  onTogglePermission: (compositeId: string) => void;
  onRemoveNewSession?: (compositeId: string) => void;
}> = ({
  sessionIds,
  projects,
  expandedCards,
  savedLayout,
  newSessionCards = [],
  onRemove,
  onToggleExpand,
  onLayoutChange,
  getPermissionMode,
  onTogglePermission,
  onRemoveNewSession,
}) => {
  const { width, containerRef, mounted } = useContainerWidth();

  const sessionLookup = useMemo(() => {
    const map = new Map<
      string,
      { session: ProjectSession; project: ProjectWithSessions }
    >();
    for (const project of projects) {
      for (const session of project.sessions) {
        map.set(session.compositeId, { session, project });
      }
    }
    return map;
  }, [projects]);

  const newSessionLookup = useMemo(() => {
    const map = new Map<string, NewSessionCard>();
    for (const card of newSessionCards) {
      map.set(card.compositeId, card);
    }
    return map;
  }, [newSessionCards]);

  const displaySessions = useMemo(
    () =>
      sessionIds
        .map((id) => {
          const entry = sessionLookup.get(id);
          if (!entry) return null;
          return { compositeId: id, ...entry };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null),
    [sessionIds, sessionLookup],
  );

  // New session cards that are in the current display
  const displayNewSessions = useMemo(
    () =>
      sessionIds
        .map((id) => newSessionLookup.get(id))
        .filter((c): c is NewSessionCard => c !== undefined),
    [sessionIds, newSessionLookup],
  );

  // Build layout: use saved if available and ids match, else generate default
  const layout: GridLayoutItem[] = useMemo(() => {
    if (savedLayout) {
      const savedIds = new Set(savedLayout.map((l) => l.i));
      const currentIds = new Set(sessionIds);
      if (sessionIds.every((id) => savedIds.has(id))) {
        const existingItems = savedLayout
          .filter((item) => currentIds.has(item.i))
          .map((item) => {
            const isExpanded = expandedCards.has(item.i);
            return {
              ...item,
              h: isExpanded ? Math.max(item.h, EXPANDED_H) : item.h,
              minW: 1,
              minH: isExpanded ? 4 : 2,
            };
          });
        const newIds = sessionIds.filter((id) => !savedIds.has(id));
        const maxY = existingItems.reduce(
          (max, item) => Math.max(max, item.y + item.h),
          0,
        );
        const newItems = newIds.map((id, idx) => {
          const isExpanded = expandedCards.has(id);
          return {
            i: id,
            x: idx % 4,
            y: maxY,
            w: 1,
            h: isExpanded ? EXPANDED_H : COLLAPSED_H,
            minW: 1,
            minH: isExpanded ? 4 : 2,
          };
        });
        return [...existingItems, ...newItems];
      }
    }
    return generateDefaultLayout(sessionIds, expandedCards, 4);
  }, [savedLayout, sessionIds, expandedCards]);

  const handleLayoutChange = useCallback(
    (newLayout: Layout, _layouts: Partial<Record<string, Layout>>) => {
      const mapped: GridLayoutItem[] = newLayout.map((l: LayoutItem) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      }));
      onLayoutChange(mapped);
    },
    [onLayoutChange],
  );

  if (displaySessions.length === 0 && displayNewSessions.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <HexagonIcon className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm font-semibold mb-1">
          <Trans id="session-manager.empty-tab" />
        </p>
        <p className="text-xs text-muted-foreground/70">
          <Trans id="session-manager.empty-tab-hint" />
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-full">
      {mounted && (
        <ResponsiveGridLayout
          className="session-grid-layout"
          width={width}
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout }}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          compactor={verticalCompactor}
          margin={[12, 12]}
          dragConfig={{
            enabled: true,
            handle: ".drag-handle",
            bounded: false,
            threshold: 3,
          }}
          resizeConfig={{ enabled: true }}
          onLayoutChange={handleLayoutChange}
        >
          {displaySessions.map(({ compositeId, session, project }) => (
            <div key={compositeId} className="session-grid-item group">
              <div className="drag-handle absolute top-0 left-8 right-8 h-5 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity">
                <GripHorizontal className="h-4 w-4" />
              </div>
              <SessionCard
                session={session}
                projectColor={project.color}
                projectPath={project.path}
                permissionMode={getPermissionMode(compositeId)}
                isExpanded={expandedCards.has(compositeId)}
                onRemove={() => onRemove(compositeId)}
                onToggleExpand={() => onToggleExpand(compositeId)}
                onTogglePermission={() => onTogglePermission(compositeId)}
              />
            </div>
          ))}
          {displayNewSessions.map((card) => (
            <div key={card.compositeId} className="session-grid-item group">
              <div className="drag-handle absolute top-0 left-8 right-8 h-5 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity">
                <GripHorizontal className="h-4 w-4" />
              </div>
              <NewSessionTerminalCard
                card={card}
                isExpanded={expandedCards.has(card.compositeId)}
                onRemove={() => onRemoveNewSession?.(card.compositeId)}
                onToggleExpand={() => onToggleExpand(card.compositeId)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
};
