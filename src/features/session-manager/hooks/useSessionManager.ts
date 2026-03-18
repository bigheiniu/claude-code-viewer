import { useCallback, useState } from "react";
import type { PermissionMode, SessionManagerTab } from "../types";
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

  const currentTab = tabs.find((t) => t.id === activeTabId);

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
    getPermissionMode,
    togglePermissionMode,
  };
}
