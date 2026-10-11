import { parseTaskSlug } from "../../shared/task-name";
import type { CreateScratchTaskInput, CreateScratchTaskOutput } from "../../shared/scratch-task-rpc";
import { InvalidTaskNameError } from "../domain/errors";
import type { PaseoPort } from "../ports/paseo";
import type { ScratchProjectService } from "./scratch-project";
import type { TaskDirectoryAllocator } from "./task-directory-allocator";

export interface CreateScratchTaskDeps {
  projects: ScratchProjectService;
  directories: TaskDirectoryAllocator;
}

export class CreateScratchTaskService {
  private readonly projects: ScratchProjectService;
  private readonly directories: TaskDirectoryAllocator;

  constructor(deps: CreateScratchTaskDeps) {
    this.projects = deps.projects;
    this.directories = deps.directories;
  }

  async create(input: CreateScratchTaskInput, paseo: PaseoPort): Promise<CreateScratchTaskOutput> {
    const slug = input.name === undefined ? undefined : this.requireSlug(input.name);
    const project = await this.projects.ensure(paseo);
    const directory = await this.directories.allocate({ slug });
    const workspace = await paseo.createDirectoryWorkspace({
      directory,
      projectId: project.projectId,
      ...(input.name === undefined ? {} : { title: input.name }),
    });
    return { workspaceId: workspace.id, directory };
  }

  private requireSlug(name: string): string {
    const result = parseTaskSlug(name);
    if (!result.ok) throw new InvalidTaskNameError(result.message);
    return result.slug;
  }
}
