/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import type { SessionManagerTab } from "../types";
import { useTabPersistence } from "./useTabPersistence";

beforeEach(() => {
  localStorage.clear();
});

describe("useTabPersistence", () => {
  test("returns empty tabs initially", () => {
    const { result } = renderHook(() => useTabPersistence());
    expect(result.current.tabs).toEqual([]);
  });

  test("saves and loads tabs from localStorage", () => {
    const tabs: SessionManagerTab[] = [
      { id: "t1", name: "Backend", sessionIds: ["p1::s1"], createdAt: 1000 },
    ];

    const { result } = renderHook(() => useTabPersistence());
    act(() => {
      result.current.setTabs(tabs);
    });

    expect(result.current.tabs).toEqual(tabs);

    const { result: result2 } = renderHook(() => useTabPersistence());
    expect(result2.current.tabs).toEqual(tabs);
  });

  test("saves and loads activeTabId", () => {
    const { result } = renderHook(() => useTabPersistence());
    act(() => {
      result.current.setActiveTabId("t1");
    });
    expect(result.current.activeTabId).toBe("t1");
  });
});
