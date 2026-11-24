import { createFileRoute } from "@tanstack/react-router";

import { AgentsPage } from "../components/agents/AgentsPage";

export const Route = createFileRoute("/_chat/agents")({
  component: AgentsPage,
});
