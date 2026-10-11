import path from "node:path";
import type { WorkspaceSummary } from "../ports/paseo";

export interface CreatedAgent {
  workspaceId: string | null;
  parentAgentId: string | null;
}

export function isTitleSourceAgent(agent: CreatedAgent): agent is CreatedAgent & { workspaceId: string } {
  return agent.workspaceId !== null && agent.parentAgentId === null;
}

export interface WorkspaceTitleInput {
  scratchRoot: string;
  workspace: Pick<WorkspaceSummary, "projectRootPath" | "title">;
  agentTitle: string | null;
}

/** Returns the title to set, or null when the workspace title must stay as it is. */
export function decideWorkspaceTitle({ scratchRoot, workspace, agentTitle }: WorkspaceTitleInput): string | null {
  if (path.resolve(workspace.projectRootPath) !== path.resolve(scratchRoot)) return null;
  if (workspace.title) return null;
  if (agentTitle === null || agentTitle.trim() === "") return null;
  return agentTitle;
}
