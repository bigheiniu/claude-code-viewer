import { useCallback, useState } from "react";
import type {
  GridLayoutItem,
  PermissionMode,
  SessionManagerTab,
} from "../types";
import { useTabPersistence } from "./useTabPersistence";

export function useSessionManager() {
  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    expandedProjects,
    setExpandedProjects,
    permissionOverrides,
    setPermissionOverrides,
    getGridLayout,
    setGridLayout,
    getExpandedCards,
    setExpandedCards,
  } = useTabPersistence();

  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSession = useCallback((compositeId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(compositeId)) {
        next.delete(compositeId);
      } else {
        next.add(compositeId);
      }
      return next;
    });
  }, []);

  const selectAllInProject = useCallback((sessionCompositeIds: string[]) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      const allSelected = sessionCompositeIds.every((id) => next.has(id));
      for (const id of sessionCompositeIds) {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allCompositeIds: string[]) => {
    setSelectedSessions(new Set(allCompositeIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessions(new Set());
  }, []);

  const toggleProject = useCallback(
    (projectId: string) => {
      setExpandedProjects(
        expandedProjects.includes(projectId)
          ? expandedProjects.filter((id) => id !== projectId)
          : [...expandedProjects, projectId],
      );
    },
    [expandedProjects, setExpandedProjects],
  );

  const createTab = useCallback(
    (name: string) => {
      const newTab: SessionManagerTab = {
        id: `tab-${Date.now()}`,
        name,
        sessionIds: [...selectedSessions],
        createdAt: Date.now(),
      };
      const newTabs = [...tabs, newTab];
      setTabs(newTabs);
      setActiveTabId(newTab.id);
    },
    [selectedSessions, tabs, setTabs, setActiveTabId],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const newTabs = tabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0]?.id ?? null);
      }
    },
    [tabs, activeTabId, setTabs, setActiveTabId],
  );

  const addToTab = useCallback(
    (compositeId: string) => {
      if (!activeTabId) return;
      setTabs(
        tabs.map((t) =>
          t.id === activeTabId && !t.sessionIds.includes(compositeId)
            ? { ...t, sessionIds: [...t.sessionIds, compositeId] }
            : t,
        ),
      );
    },
    [activeTabId, tabs, setTabs],
  );

  const removeFromTab = useCallback(
    (compositeId: string) => {
      if (!activeTabId) return;
      setTabs(
        tabs.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                sessionIds: t.sessionIds.filter((id) => id !== compositeId),
              }
            : t,
        ),
      );
    },
    [activeTabId, tabs, setTabs],
  );

  const renameTab = useCallback(
    (tabId: string, newName: string) => {
      setTabs(tabs.map((t) => (t.id === tabId ? { ...t, name: newName } : t)));
    },
    [tabs, setTabs],
  );

  const getPermissionMode = useCallback(
    (compositeId: string): PermissionMode =>
      permissionOverrides[compositeId] ?? "default",
    [permissionOverrides],
  );

  const togglePermissionMode = useCallback(
    (compositeId: string) => {
      const current = permissionOverrides[compositeId] ?? "default";
      const next: PermissionMode =
        current === "default" ? "bypassPermissions" : "default";
      setPermissionOverrides({ ...permissionOverrides, [compositeId]: next });
    },
    [permissionOverrides, setPermissionOverrides],
  );

  const toggleCardExpanded = useCallback(
    (compositeId: string) => {
      const tabKey = activeTabId ?? "__no_tab__";
      const currentCards = getExpandedCards(tabKey);
      const cardSet = new Set(currentCards);
      if (cardSet.has(compositeId)) {
        cardSet.delete(compositeId);
      } else {
        cardSet.add(compositeId);
      }
      setExpandedCards(tabKey, Array.from(cardSet));
    },
    [activeTabId, getExpandedCards, setExpandedCards],
  );

  // Bug #4 fix: Use fallback key for no-tab view to persist layout
  const updateGridLayout = useCallback(
    (layout: GridLayoutItem[]) => {
      const tabKey = activeTabId ?? "__no_tab__";
      setGridLayout(tabKey, layout);
    },
    [activeTabId, setGridLayout],
  );

  const currentGridLayout = getGridLayout(activeTabId ?? "__no_tab__");

  const currentTab = tabs.find((t) => t.id === activeTabId);

  // Derive expanded cards for current tab
  const tabKey = activeTabId ?? "__no_tab__";
  const expandedCards = new Set(getExpandedCards(tabKey));

  return {
    expandedProjects: new Set(expandedProjects),
    selectedSessions,
    searchQuery,
    setSearchQuery,
    toggleProject,
    toggleSession,
    selectAllInProject,
    selectAll,
    clearSelection,
    tabs,
    activeTabId,
    currentTab,
    setActiveTabId,
    createTab,
    closeTab,
    addToTab,
    removeFromTab,
    renameTab,
    getPermissionMode,
    togglePermissionMode,
    expandedCards,
    toggleCardExpanded,
    currentGridLayout,
    updateGridLayout,
  };
}
