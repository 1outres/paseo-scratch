import { decideWorkspaceTitle, isTitleSourceAgent, type CreatedAgent } from "../domain/title-fill";
import type { PaseoPort } from "../ports/paseo";

export class WorkspaceTitleFiller {
  private readonly root: string;

  constructor(deps: { root: string }) {
    this.root = deps.root;
  }

  async handleAgentCreated(agent: CreatedAgent & { id: string }, paseo: PaseoPort): Promise<void> {
    if (!isTitleSourceAgent(agent)) return;
    const workspace = await paseo.getWorkspace(agent.workspaceId);
    // Paseo 0.11.2 sends title null in agent.created, so read the title from a fresh agent snapshot.
    const agentTitle = await paseo.getAgentTitle(agent.id);
    const title = decideWorkspaceTitle({ scratchRoot: this.root, workspace, agentTitle });
    if (title !== null) await paseo.setWorkspaceTitle(workspace.id, title);
  }
}
