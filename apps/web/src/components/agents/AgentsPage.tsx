import { formatModelSlugName } from "@t3tools/shared/model";
import { Link } from "@tanstack/react-router";
import { T, useGT } from "gt-react";
import { useState } from "react";

import { isElectron } from "~/env";
import { cn } from "../../lib/utils";
import { useProjects, useVisibleThreadShells } from "../../state/entities";
import { resolveWorkingStartedAt } from "../Sidebar.logic";
import { RunOutputTokens, WorkingDuration } from "../sidebar/SidebarThreadRow";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SidebarInset } from "../ui/sidebar";
import { WorkspaceBreadcrumb, WorkspaceBreadcrumbItem } from "../WorkspaceBreadcrumb";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { projectFilterKey, selectAgentRows, type AgentStatus } from "./AgentsPage.logic";

const ALL_PROJECTS = "all";

const STATUS_CLASS: Record<AgentStatus, string> = {
  approval: "text-warning-foreground",
  input: "text-indigo-600 dark:text-indigo-300",
  request: "text-guest-foreground",
  preparing: "text-info-foreground",
  working: "text-info-foreground",
  waiting: "text-muted-foreground",
};

function useStatusLabel(): (status: AgentStatus) => string {
  const gt = useGT();
  return (status) => {
    switch (status) {
      case "approval":
        return gt("Approval", { $context: "thread status: needs approval" });
      case "input":
        return gt("Input", { $context: "thread status: needs user input" });
      case "request":
        return gt("Request", { $context: "thread status: guest request" });
      case "preparing":
        return gt("Setting up");
      case "working":
        return gt("Working", { $context: "thread status" });
      case "waiting":
        return gt("Waiting", { $context: "thread status" });
    }
  };
}

export function AgentsPage() {
  const gt = useGT();
  const statusLabel = useStatusLabel();
  const threads = useVisibleThreadShells();
  const projects = useProjects();
  const [projectKey, setProjectKey] = useState(ALL_PROJECTS);
  const rows = selectAgentRows(threads, projectKey === ALL_PROJECTS ? null : projectKey);
  const projectTitles = new Map(
    projects.map((project) => [
      projectFilterKey({ ...project, projectId: project.id }),
      project.title,
    ]),
  );

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-y-auto overscroll-y-none">
      <WorkspacePageHeader electron={isElectron} className="border-b">
        <WorkspaceBreadcrumb ariaLabel={gt("Agents breadcrumb")} className="flex-1">
          <WorkspaceBreadcrumbItem current>
            <h1 className="truncate">
              <T context="page listing running agents">Agents</T>
            </h1>
          </WorkspaceBreadcrumbItem>
        </WorkspaceBreadcrumb>
        <Select value={projectKey} onValueChange={(value) => setProjectKey(value ?? ALL_PROJECTS)}>
          <SelectTrigger
            aria-label={gt("Project")}
            size="compact"
            variant="ghost"
            className="w-auto min-w-0"
          >
            <SelectValue>
              {projectKey === ALL_PROJECTS
                ? gt("All projects")
                : (projectTitles.get(projectKey) ?? projectKey)}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            <SelectItem value={ALL_PROJECTS}>
              <T>All projects</T>
            </SelectItem>
            {[...projectTitles].map(([key, title]) => (
              <SelectItem key={key} value={key}>
                {title}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </WorkspacePageHeader>
      <WorkspacePageContainer width="wide" className="gap-1">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            <T>No agents are working or waiting.</T>
          </p>
        ) : (
          rows.map(({ thread, status }) => (
            <Link
              key={`${thread.environmentId}:${thread.id}`}
              to="/$environmentId/$threadId"
              params={{ environmentId: thread.environmentId, threadId: thread.id }}
              className="flex items-center gap-4 rounded-md px-3 py-2 text-sm hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1 truncate">
                {thread.lineage.relationshipToParent === "subagent" ? (
                  <span className="text-muted-foreground">↳ </span>
                ) : null}
                {thread.title}
              </span>
              <span className="w-40 shrink-0 truncate text-muted-foreground">
                {projectTitles.get(projectFilterKey(thread)) ?? ""}
              </span>
              <span className="w-36 shrink-0 truncate text-muted-foreground">
                {formatModelSlugName(thread.modelSelection.model)}
              </span>
              <span className={cn("w-56 shrink-0 truncate font-medium", STATUS_CLASS[status])}>
                {statusLabel(status)}
                {status === "preparing" || status === "working" ? (
                  <>
                    {" "}
                    <WorkingDuration
                      environmentId={thread.environmentId}
                      startedAt={resolveWorkingStartedAt(thread)}
                    />
                  </>
                ) : null}
                {status === "working" ? (
                  <RunOutputTokens tokens={thread.source.latestRunOutputTokens} />
                ) : null}
              </span>
            </Link>
          ))
        )}
      </WorkspacePageContainer>
    </SidebarInset>
  );
}
