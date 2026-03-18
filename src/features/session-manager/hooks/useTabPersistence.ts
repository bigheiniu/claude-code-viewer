import { useCallback, useState } from "react";
import type { PermissionMode, SessionManagerTab } from "../types";

const TABS_KEY = "ccv-session-manager-tabs";
const ACTIVE_TAB_KEY = "ccv-session-manager-active-tab";
const EXPANDED_KEY = "ccv-session-manager-expanded";
const PERMISSION_KEY = "ccv-session-manager-permissions";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useTabPersistence() {
  const [tabs, setTabsState] = useState<SessionManagerTab[]>(() =>
    loadFromStorage<SessionManagerTab[]>(TABS_KEY, []),
  );
  const [activeTabId, setActiveTabIdState] = useState<string | null>(() =>
    loadFromStorage<string | null>(ACTIVE_TAB_KEY, null),
  );
  const [expandedProjects, setExpandedProjectsState] = useState<string[]>(() =>
    loadFromStorage<string[]>(EXPANDED_KEY, []),
  );

  const setTabs = useCallback((newTabs: SessionManagerTab[]) => {
    setTabsState(newTabs);
    saveToStorage(TABS_KEY, newTabs);
  }, []);

  const setActiveTabId = useCallback((id: string | null) => {
    setActiveTabIdState(id);
    saveToStorage(ACTIVE_TAB_KEY, id);
  }, []);

  const setExpandedProjects = useCallback((ids: string[]) => {
    setExpandedProjectsState(ids);
    saveToStorage(EXPANDED_KEY, ids);
  }, []);

  const [permissionOverrides, setPermissionOverridesState] = useState<
    Record<string, PermissionMode>
  >(() => loadFromStorage<Record<string, PermissionMode>>(PERMISSION_KEY, {}));

  const setPermissionOverrides = useCallback(
    (overrides: Record<string, PermissionMode>) => {
      setPermissionOverridesState(overrides);
      saveToStorage(PERMISSION_KEY, overrides);
    },
    [],
  );

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    expandedProjects,
    setExpandedProjects,
    permissionOverrides,
    setPermissionOverrides,
  };
}
