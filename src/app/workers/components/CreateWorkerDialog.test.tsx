/**
 * @vitest-environment jsdom
 */
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CreateWorkerDialog } from "./CreateWorkerDialog";

i18n.activate("en");

const renderWithI18n = (ui: ReactElement) => {
  return render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>);
};

describe("CreateWorkerDialog", () => {
  it("renders form fields when open", () => {
    renderWithI18n(
      <CreateWorkerDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByPlaceholderText(/name/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/description/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/project/i)).toBeDefined();
  });

  it("does not render when closed", () => {
    renderWithI18n(
      <CreateWorkerDialog
        open={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.queryByPlaceholderText(/name/i)).toBeNull();
  });
});
