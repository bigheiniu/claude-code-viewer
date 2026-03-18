export interface SessionManagerTab {
  id: string;
  name: string;
  sessionIds: string[];
  createdAt: number;
}

export type PermissionMode = "default" | "bypassPermissions";

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface TabGridLayouts {
  [tabId: string]: GridLayoutItem[];
}

export interface ProjectWithSessions {
  id: string;
  name: string;
  path: string;
  color: string;
  sessions: ProjectSession[];
}

export interface NewSessionCard {
  compositeId: string;
  projectId: string;
  projectPath: string;
  projectColor: string;
  projectName: string;
  createdAt: number;
}

export interface ProjectSession {
  sessionId: string;
  compositeId: string;
  projectId: string;
  title: string;
  memoryTitle: string | null;
  messageCount: number;
  lastModifiedAt: string | null;
  firstUserMessage: string | null;
  status?: "running" | "paused";
  modelName?: string | null;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
}
