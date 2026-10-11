import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import type { ActiveWorkspace, PaseoPort } from "../ports/paseo";

type PaseoApi = PluginHandlerContext["paseo"];
type PaseoWorkspaceListOptions = NonNullable<Parameters<PaseoApi["workspaces"]["list"]>[0]>;

// The largest page size Paseo 0.11.2 accepts for fetch_workspaces_request.
const WORKSPACE_PAGE_SIZE = 200;

// The daemon of Paseo 0.11.2 accepts filter.includeBackground (its own workspaces.ref().refresh() sends it),
// but the published @getpaseo/client 0.11.2 types do not have the field yet.
const INCLUDE_BACKGROUND_FILTER = { includeBackground: true } as NonNullable<PaseoWorkspaceListOptions["filter"]>;

export class PaseoOperationError extends Error {
  override readonly name = "PaseoOperationError";
}

export function createPaseoPort(paseo: PaseoApi): PaseoPort {
  return {
    async listProjects() {
      const { projects } = await paseo.projects.list();
      return projects.map(({ projectId, projectRootPath }) => ({ projectId, projectRootPath }));
    },

    async listActiveWorkspaces() {
      const workspaces: ActiveWorkspace[] = [];
      let cursor: string | undefined;
      do {
        const { entries, pageInfo } = await paseo.workspaces.list({
          filter: INCLUDE_BACKGROUND_FILTER,
          page: { limit: WORKSPACE_PAGE_SIZE, ...(cursor === undefined ? {} : { cursor }) },
        });
        for (const entry of entries) {
          if (entry.workspaceDirectory === undefined) {
            throw new PaseoOperationError(`Workspace ${entry.id} has no directory in the workspace list.`);
          }
          workspaces.push({ id: entry.id, directory: entry.workspaceDirectory });
        }
        cursor = pageInfo.hasMore ? (pageInfo.nextCursor ?? undefined) : undefined;
        if (pageInfo.hasMore && cursor === undefined) {
          throw new PaseoOperationError("The workspace list has more pages but no cursor.");
        }
      } while (cursor !== undefined);
      return workspaces;
    },

    async openWorkspace(directory) {
      const workspace = await paseo.workspaces.open(directory);
      return { id: workspace.id };
    },

    async archiveWorkspace(workspaceId) {
      const result = await paseo.workspaces.archive(workspaceId);
      if (result.error !== null) {
        throw new PaseoOperationError(`Could not archive workspace ${workspaceId}: ${result.error}`);
      }
    },

    async createDirectoryWorkspace({ directory, projectId, title }) {
      const workspace = await paseo.workspaces.create({
        source: { kind: "directory", path: directory, projectId },
        ...(title === undefined ? {} : { title }),
      });
      return { id: workspace.id };
    },

    async getWorkspace(workspaceId) {
      const workspace = await paseo.workspaces.ref(workspaceId).refresh();
      if (workspace === null) throw new PaseoOperationError(`Workspace ${workspaceId} was not found.`);
      return { id: workspace.id, projectRootPath: workspace.projectRootPath, title: workspace.title ?? null };
    },

    async getAgentTitle(agentId) {
      const result = await paseo.agents.ref(agentId).refresh();
      if (result === null) throw new PaseoOperationError(`Agent ${agentId} was not found.`);
      return result.agent.title;
    },

    async setWorkspaceTitle(workspaceId, title) {
      await paseo.workspaces.ref(workspaceId).setTitle(title);
    },
  };
}
