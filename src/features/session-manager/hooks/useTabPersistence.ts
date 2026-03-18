import { useCallback, useRef, useState } from "react";
import type {
  GridLayoutItem,
  PermissionMode,
  SessionManagerTab,
  TabGridLayouts,
} from "../types";

const TABS_KEY = "ccv-session-manager-tabs";
const ACTIVE_TAB_KEY = "ccv-session-manager-active-tab";
const EXPANDED_KEY = "ccv-session-manager-expanded";
const PERMISSION_KEY = "ccv-session-manager-permissions";
const GRID_LAYOUTS_KEY = "ccv-session-manager-grid-layouts";
const EXPANDED_CARDS_KEY = "ccv-session-manager-expanded-cards";
const HIDDEN_SESSIONS_KEY = "ccv-session-manager-hidden";

function loadFromStorage<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isSessionManagerTabArray(
  value: unknown,
): value is SessionManagerTab[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "sessionIds" in item,
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPermissionOverrides(
  value: unknown,
): value is Record<string, PermissionMode> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTabGridLayouts(value: unknown): value is TabGridLayouts {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTabExpandedCards(value: unknown): value is Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((v) => isStringArray(v));
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
    loadFromStorage(TABS_KEY, [], isSessionManagerTabArray),
  );
  const [activeTabId, setActiveTabIdState] = useState<string | null>(() =>
    loadFromStorage(ACTIVE_TAB_KEY, null, isStringOrNull),
  );
  const [expandedProjects, setExpandedProjectsState] = useState<string[]>(() =>
    loadFromStorage(EXPANDED_KEY, [], isStringArray),
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
  >(() => loadFromStorage(PERMISSION_KEY, {}, isPermissionOverrides));

  const setPermissionOverrides = useCallback(
    (overrides: Record<string, PermissionMode>) => {
      setPermissionOverridesState(overrides);
      saveToStorage(PERMISSION_KEY, overrides);
    },
    [],
  );

  const [gridLayouts, setGridLayoutsState] = useState<TabGridLayouts>(() =>
    loadFromStorage(GRID_LAYOUTS_KEY, {}, isTabGridLayouts),
  );

  const gridLayoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setGridLayout = useCallback(
    (tabId: string, layout: GridLayoutItem[]) => {
      setGridLayoutsState((prev) => {
        const next = { ...prev, [tabId]: layout };
        // Debounce localStorage write to avoid thrashing during drag operations
        if (gridLayoutTimerRef.current) {
          clearTimeout(gridLayoutTimerRef.current);
        }
        gridLayoutTimerRef.current = setTimeout(() => {
          saveToStorage(GRID_LAYOUTS_KEY, next);
        }, 500);
        return next;
      });
    },
    [],
  );

  const getGridLayout = useCallback(
    (tabId: string): GridLayoutItem[] | undefined => gridLayouts[tabId],
    [gridLayouts],
  );

  const [hiddenSessions, setHiddenSessionsState] = useState<string[]>(() =>
    loadFromStorage(HIDDEN_SESSIONS_KEY, [], isStringArray),
  );

  const setHiddenSessions = useCallback((ids: string[]) => {
    setHiddenSessionsState(ids);
    saveToStorage(HIDDEN_SESSIONS_KEY, ids);
  }, []);

  const [tabExpandedCards, setTabExpandedCardsState] = useState<
    Record<string, string[]>
  >(() => loadFromStorage(EXPANDED_CARDS_KEY, {}, isTabExpandedCards));

  const expandedCardsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const _setExpandedCards = useCallback((tabId: string, cards: string[]) => {
    setTabExpandedCardsState((prev) => {
      const next = { ...prev, [tabId]: cards };
      // Debounce localStorage write to avoid thrashing during batch operations
      if (expandedCardsTimerRef.current) {
        clearTimeout(expandedCardsTimerRef.current);
      }
      expandedCardsTimerRef.current = setTimeout(() => {
        saveToStorage(EXPANDED_CARDS_KEY, next);
      }, 500);
      return next;
    });
  }, []);

  const _getExpandedCards = useCallback(
    (tabId: string): string[] => tabExpandedCards[tabId] ?? [],
    [tabExpandedCards],
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
    getGridLayout,
    setGridLayout,
    getExpandedCards: _getExpandedCards,
    setExpandedCards: _setExpandedCards,
    hiddenSessions,
    setHiddenSessions,
  };
}
