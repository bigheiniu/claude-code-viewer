import { Trans } from "@lingui/react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { FC } from "react";
import { cn } from "@/lib/utils";

export const TopNav: FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const tabs = [
    { to: "/projects", label: "nav.projects" },
    { to: "/workers", label: "nav.workers" },
  ] as const;

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
          <Trans id={tab.label} />
        </Link>
      ))}
    </nav>
  );
};
