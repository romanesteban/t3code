import { resolveSidebarThreadStatus, type SidebarThreadStatus } from "../Sidebar.logic";
import type { SidebarThreadSummary } from "../../types";

export type AgentStatus = Extract<
  SidebarThreadStatus,
  "approval" | "input" | "request" | "preparing" | "working" | "waiting"
>;

// Lower ranks first: what needs the user, then what is working, then what waits.
const STATUS_RANK: Partial<Record<SidebarThreadStatus, number>> = {
  approval: 0,
  input: 0,
  request: 0,
  preparing: 1,
  working: 1,
  waiting: 2,
};

type AgentThreadInput = Pick<
  SidebarThreadSummary,
  | "environmentId"
  | "projectId"
  | "lineage"
  | "updatedAt"
  | "hasPendingApprovals"
  | "hasPendingUserInput"
  | "pendingSubagentRequest"
  | "pendingGuestMessageCount"
  | "runtime"
  | "blockedOnThreadWait"
>;

export interface AgentRow<T> {
  readonly thread: T;
  readonly status: AgentStatus;
}

export function projectFilterKey(
  thread: Pick<SidebarThreadSummary, "environmentId" | "projectId">,
): string {
  return `${thread.environmentId}:${thread.projectId}`;
}

/** Threads with an agent at work or waiting, subagents included, optionally for one project. */
export function selectAgentRows<T extends AgentThreadInput>(
  threads: ReadonlyArray<T>,
  projectKey: string | null,
): ReadonlyArray<AgentRow<T>> {
  const rows: Array<AgentRow<T> & { readonly rank: number }> = [];
  for (const thread of threads) {
    if (thread.lineage.sideChat === true || thread.lineage.workflowStep === true) continue;
    if (projectKey !== null && projectFilterKey(thread) !== projectKey) continue;
    const status = resolveSidebarThreadStatus(thread);
    const rank = STATUS_RANK[status];
    if (rank === undefined) continue;
    rows.push({ thread, status: status as AgentStatus, rank });
  }
  return rows
    .toSorted(
      (left, right) =>
        left.rank - right.rank || right.thread.updatedAt.localeCompare(left.thread.updatedAt),
    )
    .map(({ thread, status }) => ({ thread, status }));
}
