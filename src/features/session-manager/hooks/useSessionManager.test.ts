/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useSessionManager } from "./useSessionManager";

beforeEach(() => {
  localStorage.clear();
});

describe("useSessionManager", () => {
  test("initializes with empty state", () => {
    const { result } = renderHook(() => useSessionManager());
    expect(result.current.selectedSessions.size).toBe(0);
    expect(result.current.searchQuery).toBe("");
    expect(result.current.tabs).toEqual([]);
  });

  test("toggleSession adds and removes from selection", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => result.current.toggleSession("p1::s1"));
    expect(result.current.selectedSessions.has("p1::s1")).toBe(true);
    act(() => result.current.toggleSession("p1::s1"));
    expect(result.current.selectedSessions.has("p1::s1")).toBe(false);
  });

  test("createTab creates a tab from selected sessions", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.toggleSession("p1::s2");
    });
    act(() => {
      result.current.createTab("Backend");
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0]?.name).toBe("Backend");
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s1");
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s2");
    expect(result.current.activeTabId).toBe(result.current.tabs[0]?.id);
  });

  test("closeTab removes tab and switches active tab", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.createTab("Tab1");
    });
    const tabId = result.current.tabs[0]?.id;
    expect(tabId).toBeDefined();
    act(() => {
      if (tabId) result.current.closeTab(tabId);
    });
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeTabId).toBeNull();
  });

  test("addToTab adds session to active tab", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.createTab("Tab1");
    });
    act(() => {
      result.current.addToTab("p1::s2");
    });
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s2");
  });

  test("removeFromTab removes session from active tab", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.toggleSession("p1::s2");
    });
    act(() => {
      result.current.createTab("Tab1");
    });
    act(() => {
      result.current.removeFromTab("p1::s1");
    });
    expect(result.current.tabs[0]?.sessionIds).not.toContain("p1::s1");
    expect(result.current.tabs[0]?.sessionIds).toContain("p1::s2");
  });

  test("selectAllInProject toggles all sessions", () => {
    const { result } = renderHook(() => useSessionManager());
    const sessionIds = ["p1::s1", "p1::s2", "p1::s3"];
    act(() => {
      result.current.selectAllInProject(sessionIds);
    });
    expect(result.current.selectedSessions.size).toBe(3);
    act(() => {
      result.current.selectAllInProject(sessionIds);
    });
    expect(result.current.selectedSessions.size).toBe(0);
  });

  test("clearSelection empties selection", () => {
    const { result } = renderHook(() => useSessionManager());
    act(() => {
      result.current.toggleSession("p1::s1");
      result.current.toggleSession("p1::s2");
    });
    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedSessions.size).toBe(0);
  });
});
