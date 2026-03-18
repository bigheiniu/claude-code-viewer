import { describe, expect, test } from "vitest";
import {
  filterProjects,
  getProjectColor,
  getProjectDisplayName,
  makeCompositeId,
  parseCompositeId,
} from "./utils";

describe("getProjectColor", () => {
  test("returns consistent color for the same path", () => {
    const color1 = getProjectColor("/Users/alice/dev/acme");
    const color2 = getProjectColor("/Users/alice/dev/acme");
    expect(color1).toBe(color2);
  });

  test("returns a valid hex color", () => {
    const color = getProjectColor("/some/path");
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("getProjectDisplayName", () => {
  test("extracts last path segment from encoded project path", () => {
    expect(getProjectDisplayName("-Users-alice-dev-acme-web-app")).toBe("app");
  });

  test("handles single segment", () => {
    expect(getProjectDisplayName("my-project")).toBe("project");
  });
});

describe("filterProjects", () => {
  const projects = [
    {
      id: "p1",
      name: "acme-web-app",
      path: "~/dev/acme-web-app",
      sessions: [
        { id: "s1", title: "auth refactor" },
        { id: "s2", title: "api endpoints" },
      ],
    },
    {
      id: "p2",
      name: "infra-platform",
      path: "~/dev/infra-platform",
      sessions: [{ id: "s3", title: "ci pipeline" }],
    },
  ];

  test("returns all projects when query is empty", () => {
    const result = filterProjects(projects, "");
    expect(result).toHaveLength(2);
  });

  test("filters by project name", () => {
    const result = filterProjects(projects, "acme");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("acme-web-app");
  });

  test("filters by session title", () => {
    const result = filterProjects(projects, "pipeline");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("infra-platform");
  });

  test("is case insensitive", () => {
    const result = filterProjects(projects, "ACME");
    expect(result).toHaveLength(1);
  });
});

describe("makeCompositeId / parseCompositeId", () => {
  test("round-trips correctly", () => {
    const composite = makeCompositeId("proj1", "sess1");
    expect(composite).toBe("proj1::sess1");
    const parsed = parseCompositeId(composite);
    expect(parsed).toEqual({ projectId: "proj1", sessionId: "sess1" });
  });
});
