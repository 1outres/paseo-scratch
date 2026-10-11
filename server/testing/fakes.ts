import path from "node:path";
import type { Clock } from "../ports/clock";
import type { CreateDirectoryResult, FileSystemPort } from "../ports/file-system";
import type {
  ActiveWorkspace,
  CreateDirectoryWorkspaceInput,
  PaseoPort,
  ProjectSummary,
  WorkspaceSummary,
} from "../ports/paseo";

export class FakeClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(next: Date): void {
    this.current = next;
  }
}

export class FakeFileSystem implements FileSystemPort {
  readonly directories = new Set<string>();
  readonly files = new Set<string>();
  readonly failures = new Map<string, Error>();
  renameFailure: Error | null = null;
  /** Runs inside createDirectory, before the result, to act like another process at that moment. */
  onCreateDirectory: ((target: string) => void) | null = null;

  async createDirectory(target: string): Promise<CreateDirectoryResult> {
    this.throwIfFailing(target);
    this.onCreateDirectory?.(target);
    if (this.directories.has(target)) return "already-exists";
    if (!this.directories.has(path.dirname(target))) {
      throw Object.assign(new Error(`ENOENT: ${target}`), { code: "ENOENT" });
    }
    this.directories.add(target);
    return "created";
  }

  async ensureDirectory(target: string): Promise<void> {
    this.throwIfFailing(target);
    let current = target;
    while (!this.directories.has(current)) {
      this.directories.add(current);
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  async exists(target: string): Promise<boolean> {
    return this.directories.has(target) || this.files.has(target);
  }

  async isDirectory(target: string): Promise<boolean> {
    return this.directories.has(target);
  }

  async rename(from: string, to: string): Promise<void> {
    if (this.renameFailure) throw this.renameFailure;
    if (!this.directories.has(from)) throw Object.assign(new Error(`ENOENT: ${from}`), { code: "ENOENT" });
    if (this.entriesUnder(to).length > 0) throw Object.assign(new Error(`ENOTEMPTY: ${to}`), { code: "ENOTEMPTY" });
    for (const set of [this.directories, this.files]) {
      for (const entry of [...set]) {
        if (entry === from || entry.startsWith(`${from}/`)) {
          set.delete(entry);
          set.add(to + entry.slice(from.length));
        }
      }
    }
  }

  async removeEmptyDirectory(target: string): Promise<void> {
    if (this.entriesUnder(target).length > 0) throw Object.assign(new Error(`ENOTEMPTY: ${target}`), { code: "ENOTEMPTY" });
    if (!this.directories.delete(target)) throw Object.assign(new Error(`ENOENT: ${target}`), { code: "ENOENT" });
  }

  private entriesUnder(target: string): string[] {
    return [...this.directories, ...this.files].filter((entry) => entry.startsWith(`${target}/`));
  }

  private throwIfFailing(target: string): void {
    const failure = this.failures.get(target);
    if (failure) throw failure;
  }
}

interface FakeWorkspace extends WorkspaceSummary {
  projectId: string;
  directory: string;
  archived: boolean;
}

interface FakeAgent {
  id: string;
  title: string | null;
}

export type PaseoCall =
  | { method: "listProjects" }
  | { method: "listActiveWorkspaces" }
  | { method: "openWorkspace"; directory: string }
  | { method: "archiveWorkspace"; workspaceId: string }
  | { method: "createDirectoryWorkspace"; input: CreateDirectoryWorkspaceInput }
  | { method: "getWorkspace"; workspaceId: string }
  | { method: "getAgentTitle"; agentId: string }
  | { method: "setWorkspaceTitle"; workspaceId: string; title: string };

/** In-memory Paseo that follows the facts checked on Paseo 0.11.2. */
export class FakePaseo implements PaseoPort {
  readonly projects: ProjectSummary[] = [];
  readonly workspaces = new Map<string, FakeWorkspace>();
  readonly agents = new Map<string, FakeAgent>();
  readonly calls: PaseoCall[] = [];
  private nextId = 1;

  addProject(projectRootPath: string): ProjectSummary {
    const project = { projectId: `prj_${this.nextId++}`, projectRootPath };
    this.projects.push(project);
    return project;
  }

  addWorkspace(input: { projectRootPath: string; title: string | null }): FakeWorkspace {
    const project =
      this.projects.find((p) => p.projectRootPath === input.projectRootPath) ??
      this.addProject(input.projectRootPath);
    const workspace: FakeWorkspace = {
      id: `wks_${this.nextId++}`,
      projectId: project.projectId,
      projectRootPath: project.projectRootPath,
      directory: project.projectRootPath,
      title: input.title,
      archived: false,
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  addDirectoryWorkspace(input: { projectId: string; directory: string }): FakeWorkspace {
    const project = this.projects.find((p) => p.projectId === input.projectId);
    if (!project) throw new Error(`unknown project ${input.projectId}`);
    const workspace: FakeWorkspace = {
      id: `wks_${this.nextId++}`,
      projectId: project.projectId,
      projectRootPath: project.projectRootPath,
      directory: input.directory,
      title: null,
      archived: false,
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  addAgent(title: string | null): FakeAgent {
    const agent = { id: `agt_${this.nextId++}`, title };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    this.calls.push({ method: "listProjects" });
    return this.projects.map((project) => ({ ...project }));
  }

  async listActiveWorkspaces(): Promise<ActiveWorkspace[]> {
    this.calls.push({ method: "listActiveWorkspaces" });
    return [...this.workspaces.values()]
      .filter((workspace) => !workspace.archived)
      .map(({ id, directory }) => ({ id, directory }));
  }

  async openWorkspace(directory: string): Promise<{ id: string }> {
    this.calls.push({ method: "openWorkspace", directory });
    const active = [...this.workspaces.values()].find((w) => w.directory === directory && !w.archived);
    if (active) return { id: active.id };
    return { id: this.addWorkspace({ projectRootPath: directory, title: null }).id };
  }

  async archiveWorkspace(workspaceId: string): Promise<void> {
    this.calls.push({ method: "archiveWorkspace", workspaceId });
    this.requireWorkspace(workspaceId).archived = true;
  }

  async createDirectoryWorkspace(input: CreateDirectoryWorkspaceInput): Promise<{ id: string }> {
    this.calls.push({ method: "createDirectoryWorkspace", input });
    const project = this.projects.find((p) => p.projectId === input.projectId);
    if (!project) throw new Error(`unknown project ${input.projectId}`);
    const workspace: FakeWorkspace = {
      id: `wks_${this.nextId++}`,
      projectId: project.projectId,
      projectRootPath: project.projectRootPath,
      directory: input.directory,
      title: input.title ?? null,
      archived: false,
    };
    this.workspaces.set(workspace.id, workspace);
    return { id: workspace.id };
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceSummary> {
    this.calls.push({ method: "getWorkspace", workspaceId });
    const { id, projectRootPath, title } = this.requireWorkspace(workspaceId);
    return { id, projectRootPath, title };
  }

  async getAgentTitle(agentId: string): Promise<string | null> {
    this.calls.push({ method: "getAgentTitle", agentId });
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`unknown agent ${agentId}`);
    return agent.title;
  }

  async setWorkspaceTitle(workspaceId: string, title: string): Promise<void> {
    this.calls.push({ method: "setWorkspaceTitle", workspaceId, title });
    this.requireWorkspace(workspaceId).title = title;
  }

  callsTo(method: PaseoCall["method"]): PaseoCall[] {
    return this.calls.filter((call) => call.method === method);
  }

  private requireWorkspace(workspaceId: string): FakeWorkspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error(`unknown workspace ${workspaceId}`);
    return workspace;
  }
}
