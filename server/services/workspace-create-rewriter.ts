import { redirectToTaskDirectory, targetsScratchRoot } from "../domain/workspace-create-rewrite";
import type { PaseoPort, WorkspaceCreateRequest } from "../ports/paseo";
import type { ScratchProjectService } from "./scratch-project";
import type { TaskDirectoryAllocator } from "./task-directory-allocator";

export interface WorkspaceCreateRewriterDeps {
  root: string;
  projects: ScratchProjectService;
  directories: TaskDirectoryAllocator;
}

/** Turns a "+" on the scratchpad project into a new task workspace. */
export class WorkspaceCreateRewriter {
  private readonly root: string;
  private readonly projects: ScratchProjectService;
  private readonly directories: TaskDirectoryAllocator;

  constructor(deps: WorkspaceCreateRewriterDeps) {
    this.root = deps.root;
    this.projects = deps.projects;
    this.directories = deps.directories;
  }

  /** Returns the changed request, or undefined to leave the request as it is. */
  async rewrite(request: WorkspaceCreateRequest, paseo: PaseoPort): Promise<WorkspaceCreateRequest | undefined> {
    if (!targetsScratchRoot(request, this.root)) return undefined;
    const project = await this.projects.ensure(paseo);
    const taskDirectory = await this.directories.allocate({});
    return redirectToTaskDirectory(request, { taskDirectory, projectId: project.projectId });
  }
}
