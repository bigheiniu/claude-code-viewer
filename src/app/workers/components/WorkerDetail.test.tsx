/**
 * @vitest-environment jsdom
 */
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { WorkerDetail } from "./WorkerDetail";

// Setup minimal i18n for tests
i18n.load("en", {
  "workers.detail.abort": "Abort",
  "workers.detail.meta.project": "Project",
  "workers.detail.meta.session": "Session",
  "workers.detail.meta.process": "Process",
  "workers.detail.meta.last_activity": "Last Activity",
  "workers.detail.meta.created": "Created",
  "workers.detail.meta.updated": "Updated",
  "workers.detail.send_message": "Send a message",
});
i18n.activate("en");

const renderWithI18n = (ui: ReactElement) => {
  return render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>);
};

const mockWorker = {
  id: "worker-1",
  name: "eval-builder",
  description: "Builds evaluation tasks",
  projectId: "project-1",
  sessionId: "session-1",
  sessionProcessId: "process-1",
  tags: ["eval"],
  createdAt: "2026-03-10T00:00:00.000Z",
  updatedAt: "2026-03-10T00:00:00.000Z",
  status: "running" as const,
  lastActivityAt: "2026-03-10T00:00:00.000Z",
};

describe("WorkerDetail", () => {
  it("renders worker name and description", () => {
    renderWithI18n(
      <WorkerDetail
        worker={mockWorker}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAbort={vi.fn()}
        onSendMessage={vi.fn()}
        isAborting={false}
        isSending={false}
      />,
    );
    expect(screen.getByText("eval-builder")).toBeDefined();
    expect(screen.getByText("Builds evaluation tasks")).toBeDefined();
  });

  it("renders metadata fields", () => {
    renderWithI18n(
      <WorkerDetail
        worker={mockWorker}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAbort={vi.fn()}
        onSendMessage={vi.fn()}
        isAborting={false}
        isSending={false}
      />,
    );
    expect(screen.getByText("project-1")).toBeDefined();
    expect(screen.getByText("session-1")).toBeDefined();
    expect(screen.getByText("process-1")).toBeDefined();
  });

  it("renders tags", () => {
    renderWithI18n(
      <WorkerDetail
        worker={mockWorker}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAbort={vi.fn()}
        onSendMessage={vi.fn()}
        isAborting={false}
        isSending={false}
      />,
    );
    expect(screen.getByText("eval")).toBeDefined();
  });
});
