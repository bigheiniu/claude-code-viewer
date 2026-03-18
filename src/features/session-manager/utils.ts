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

/**
 * Generate a short title (max ~8 words) from a session's first user message or title.
 * Truncates intelligently at word boundaries.
 */
export function generateShortTitle(
  text: string | null | undefined,
  maxWords = 8,
): string {
  if (!text) return "Untitled Session";

  // Take first line only (messages often have multi-line content)
  const firstLine = (text.split("\n")[0] ?? text).trim();
  if (!firstLine) return "Untitled Session";

  // Split into words and take first maxWords
  const words = firstLine.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) return firstLine;

  return `${words.slice(0, maxWords).join(" ")}...`;
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
