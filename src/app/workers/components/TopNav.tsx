import { Trans } from "@lingui/react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs: ReadonlyArray<{ to: "/projects" | "/workers"; label: ReactNode }> =
  [
    { to: "/projects", label: <Trans id="nav.projects" /> },
    { to: "/workers", label: <Trans id="nav.workers" /> },
  ];

export const TopNav: FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav className="flex gap-4 border-b px-4">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={cn(
            "py-2 text-sm font-medium border-b-2 transition-colors",
            currentPath.startsWith(tab.to)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
};
