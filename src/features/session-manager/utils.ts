const PROJECT_COLORS = [
  "#d4a574",
  "#34d399",
  "#818cf8",
  "#f472b6",
  "#fbbf24",
  "#fb923c",
  "#a78bfa",
  "#38bdf8",
  "#f87171",
  "#4ade80",
  "#e879f9",
  "#22d3ee",
  "#facc15",
  "#c084fc",
  "#2dd4bf",
];

export function getProjectColor(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash + path.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PROJECT_COLORS.length;
  return PROJECT_COLORS[index] ?? "#818cf8";
}

export function getProjectDisplayName(encodedPath: string): string {
  const decoded = encodedPath.replace(/^-/, "").replaceAll("-", "/");
  const lastSegment = decoded.split("/").pop();
  return lastSegment ?? encodedPath;
}

interface FilterableProject {
  id: string;
  name: string;
  path: string;
  sessions: Array<{
    id: string;
    title: string;
    firstUserMessage?: string | null;
  }>;
}

export function filterProjects<T extends FilterableProject>(
  projects: T[],
  query: string,
): T[] {
  if (!query.trim()) return projects;
  const lowerQuery = query.toLowerCase();

  return projects
    .map((project) => {
      const projectMatches =
        project.name.toLowerCase().includes(lowerQuery) ||
        project.path.toLowerCase().includes(lowerQuery);

      if (projectMatches) return project;

      const filteredSessions = project.sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerQuery) ||
          (s.firstUserMessage?.toLowerCase().includes(lowerQuery) ?? false),
      );

      if (filteredSessions.length === 0) return null;

      return { ...project, sessions: filteredSessions };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

export function makeCompositeId(projectId: string, sessionId: string): string {
  return `${projectId}::${sessionId}`;
}

export function parseCompositeId(compositeId: string): {
  projectId: string;
  sessionId: string;
} {
  const separatorIndex = compositeId.indexOf("::");
  if (separatorIndex === -1) {
    return { projectId: "", sessionId: compositeId };
  }
  return {
    projectId: compositeId.slice(0, separatorIndex),
    sessionId: compositeId.slice(separatorIndex + 2),
  };
}
