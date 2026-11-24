import { EnvironmentId, ProjectId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { selectAgentRows } from "./AgentsPage.logic";

const environmentId = EnvironmentId.make("env");

function thread(
  id: string,
  input: {
    readonly status?: "running" | "preparing" | "idle" | "completed" | null;
    readonly approval?: boolean;
    readonly project?: string;
    readonly subagent?: boolean;
    readonly updatedAt?: string;
  },
) {
  const threadId = ThreadId.make(id);
  return {
    id,
    environmentId,
    projectId: ProjectId.make(input.project ?? "a"),
    lineage: {
      parentThreadId: input.subagent ? ThreadId.make("parent") : null,
      relationshipToParent: input.subagent ? ("subagent" as const) : null,
      rootThreadId: threadId,
    },
    updatedAt: input.updatedAt ?? "2026-01-01T00:00:00.000Z",
    hasPendingApprovals: input.approval ?? false,
    hasPendingUserInput: false,
    runtime:
      input.status == null
        ? null
        : {
            status: input.status,
            activeRunId: null,
            providerInstanceId: ProviderInstanceId.make("claude"),
            providerName: null,
            lastError: null,
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
  };
}

describe("selectAgentRows", () => {
  it("keeps listed threads needing the user, working or waiting, most urgent first", () => {
    const threads = [
      thread("waiting", { status: "idle" }),
      thread("older-working", { status: "running", updatedAt: "2026-01-01T00:00:00.000Z" }),
      thread("newer-working", { status: "running", updatedAt: "2026-01-02T00:00:00.000Z" }),
      thread("preparing", { status: "preparing", updatedAt: "2025-12-01T00:00:00.000Z" }),
      thread("approval", { status: "running", approval: true }),
      thread("done", { status: "completed" }),
      thread("never-ran", { status: null }),
      thread("subagent", { status: "running", subagent: true }),
    ];
    expect(selectAgentRows(threads, null).map((row) => [row.thread.id, row.status])).toEqual([
      ["approval", "approval"],
      ["newer-working", "working"],
      ["older-working", "working"],
      ["preparing", "preparing"],
      ["waiting", "waiting"],
    ]);
  });

  it("filters by project within an environment", () => {
    const threads = [
      thread("a", { status: "running", project: "a" }),
      thread("b", { status: "running", project: "b" }),
    ];
    expect(selectAgentRows(threads, "env:b").map((row) => row.thread.id)).toEqual(["b"]);
  });
});
