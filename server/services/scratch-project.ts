import { ScratchProjectNotCreatedError } from "../domain/errors";
import { findProjectByRoot } from "../domain/project-match";
import type { FileSystemPort } from "../ports/file-system";
import type { PaseoPort, ProjectSummary } from "../ports/paseo";
import type { GitRepositoryGuard } from "./git-repository-guard";

export interface ScratchProjectDeps {
  root: string;
  fs: FileSystemPort;
  gitGuard: GitRepositoryGuard;
}

/** Makes sure the non-git "scratchpad" project exists. Safe to call from any trigger. */
export class ScratchProjectService {
  private readonly root: string;
  private readonly fs: FileSystemPort;
  private readonly gitGuard: GitRepositoryGuard;
  private inFlight: Promise<ProjectSummary> | null = null;

  constructor(deps: ScratchProjectDeps) {
    this.root = deps.root;
    this.fs = deps.fs;
    this.gitGuard = deps.gitGuard;
  }

  ensure(paseo: PaseoPort): Promise<ProjectSummary> {
    // Two setups at the same time would both open the root and race on archiving its workspace.
    this.inFlight ??= this.run(paseo).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async run(paseo: PaseoPort): Promise<ProjectSummary> {
    await this.gitGuard.assertOutsideRepository(this.root);
    // The user may have deleted the root while the project still exists.
    await this.fs.ensureDirectory(this.root);
    const existing = findProjectByRoot(await paseo.listProjects(), this.root);
    if (existing) return existing;

    const rootWorkspace = await paseo.openWorkspace(this.root);
    // The project stays after its root workspace is archived (checked on Paseo 0.11.2).
    await paseo.archiveWorkspace(rootWorkspace.id);

    const created = findProjectByRoot(await paseo.listProjects(), this.root);
    if (!created) throw new ScratchProjectNotCreatedError(this.root);
    return created;
  }
}
