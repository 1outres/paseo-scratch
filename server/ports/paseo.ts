import type { PluginBeforeRequests } from "@getpaseo/plugin/server";

export type WorkspaceCreateRequest = PluginBeforeRequests["workspace.create"];

export interface ProjectSummary {
  projectId: string;
  projectRootPath: string;
}

export interface WorkspaceSummary {
  id: string;
  projectRootPath: string;
  title: string | null;
}

export interface ActiveWorkspace {
  id: string;
  directory: string;
}

export interface CreateDirectoryWorkspaceInput {
  directory: string;
  projectId: string;
  title?: string;
}

/** The Paseo operations this plugin uses. Throws when an operation fails. */
export interface PaseoPort {
  listProjects(): Promise<ProjectSummary[]>;
  /** All workspaces that are not archived, including background ones. */
  listActiveWorkspaces(): Promise<ActiveWorkspace[]>;
  /** Opens (or reuses) the workspace for a directory. Creates the project when needed. */
  openWorkspace(directory: string): Promise<{ id: string }>;
  archiveWorkspace(workspaceId: string): Promise<void>;
  createDirectoryWorkspace(input: CreateDirectoryWorkspaceInput): Promise<{ id: string }>;
  getWorkspace(workspaceId: string): Promise<WorkspaceSummary>;
  getAgentTitle(agentId: string): Promise<string | null>;
  setWorkspaceTitle(workspaceId: string, title: string): Promise<void>;
}
