import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import { LayoutGridIcon } from "lucide-react";
import { type FC, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { TopNav } from "../workers/components/TopNav";
import { ProjectList } from "./components/ProjectList";
import { SetupProjectDialog } from "./components/SetupProjectDialog";

export const ProjectsPage: FC = () => {
  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <p className="text-muted-foreground">
              <Trans id="projects.page.description" />
            </p>
          </header>

          <main>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  <Trans id="projects.page.title" />
                </h2>
                <div className="flex items-center gap-2">
                  <Link to="/session-manager">
                    <Button variant="outline" size="sm">
                      <LayoutGridIcon className="w-4 h-4 mr-2" />
                      <Trans id="session-manager.title" />
                    </Button>
                  </Link>
                  <SetupProjectDialog />
                </div>
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">
                      <Trans id="projects.page.loading" />
                    </div>
                  </div>
                }
              >
                <ProjectList />
              </Suspense>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};
