import { resolveScratchRoot, type PaseoHomeInput } from "./domain/paseo-home";
import type { Clock } from "./ports/clock";
import type { FileSystemPort } from "./ports/file-system";
import { CreateScratchTaskService } from "./services/create-scratch-task";
import { GitRepositoryGuard } from "./services/git-repository-guard";
import { ScratchProjectService } from "./services/scratch-project";
import { TaskArchiver } from "./services/task-archiver";
import { TaskDirectoryAllocator } from "./services/task-directory-allocator";
import { WorkspaceCreateRewriter } from "./services/workspace-create-rewriter";
import { WorkspaceTitleFiller } from "./services/workspace-title-filler";

export interface ScratchServerDeps {
  home: PaseoHomeInput;
  fs: FileSystemPort;
  clock: Clock;
}

export interface ScratchServer {
  root: string;
  projects: ScratchProjectService;
  createTask: CreateScratchTaskService;
  workspaceCreateRewriter: WorkspaceCreateRewriter;
  titleFiller: WorkspaceTitleFiller;
  archiver: TaskArchiver;
}

export function createScratchServer({ home, fs, clock }: ScratchServerDeps): ScratchServer {
  const root = resolveScratchRoot(home);
  const projects = new ScratchProjectService({ root, fs, gitGuard: new GitRepositoryGuard({ fs }) });
  const directories = new TaskDirectoryAllocator({ root, fs, clock });
  return {
    root,
    projects,
    createTask: new CreateScratchTaskService({ projects, directories }),
    workspaceCreateRewriter: new WorkspaceCreateRewriter({ root, projects, directories }),
    titleFiller: new WorkspaceTitleFiller({ root }),
    archiver: new TaskArchiver({ root, fs }),
  };
}
