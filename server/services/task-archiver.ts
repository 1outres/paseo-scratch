import path from "node:path";
import { TaskArchiveError } from "../domain/errors";
import { findProjectByRoot } from "../domain/project-match";
import { ARCHIVE_DIRECTORY_NAME, archiveDestination, isDirectoryInUse, isTaskDirectory } from "../domain/task-archive";
import type { FileSystemPort } from "../ports/file-system";
import type { PaseoPort } from "../ports/paseo";

const DEFAULT_MAX_ATTEMPTS = 1000;

export interface ArchivedWorkspace {
  id: string;
  projectId: string;
  cwd: string;
}

export type ArchiveSkipReason =
  | "not-a-task-directory"
  | "not-scratchpad-project"
  | "directory-in-use"
  | "directory-missing";

export type ArchiveResult = { kind: "moved"; from: string; to: string } | { kind: "skipped"; reason: ArchiveSkipReason };

export interface TaskArchiverDeps {
  root: string;
  fs: FileSystemPort;
  maxAttempts?: number;
}

/** Moves the task directory of an archived scratchpad workspace into `<root>/.archive`. */
export class TaskArchiver {
  private readonly root: string;
  private readonly fs: FileSystemPort;
  private readonly maxAttempts: number;

  constructor(deps: TaskArchiverDeps) {
    this.root = deps.root;
    this.fs = deps.fs;
    this.maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }

  async handleWorkspaceArchived(workspace: ArchivedWorkspace, paseo: PaseoPort): Promise<ArchiveResult> {
    if (!isTaskDirectory(workspace.cwd, this.root)) return skipped("not-a-task-directory");

    const project = findProjectByRoot(await paseo.listProjects(), this.root);
    if (project === null || project.projectId !== workspace.projectId) return skipped("not-scratchpad-project");

    if (isDirectoryInUse(workspace.cwd, workspace.id, await paseo.listActiveWorkspaces())) {
      return skipped("directory-in-use");
    }
    if (!(await this.fs.isDirectory(workspace.cwd))) return skipped("directory-missing");

    const from = path.resolve(workspace.cwd);
    const to = await this.moveIntoArchive(workspace.id, from);
    return { kind: "moved", from, to };
  }

  private async moveIntoArchive(workspaceId: string, from: string): Promise<string> {
    await this.fs.ensureDirectory(path.join(this.root, ARCHIVE_DIRECTORY_NAME));
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const to = archiveDestination(this.root, from, attempt);
      // Claim the name with a non-recursive mkdir first. A rename onto an existing empty
      // directory succeeds and replaces it, so renaming without a claim could take a name
      // that another move just got.
      if ((await this.fs.createDirectory(to)) === "already-exists") continue;
      await this.renameOntoClaim(workspaceId, from, to);
      return to;
    }
    throw new TaskArchiveError(
      `Could not archive workspace ${workspaceId}: all ${this.maxAttempts} names for ${from} in ` +
        `${path.join(this.root, ARCHIVE_DIRECTORY_NAME)} are already used.`,
    );
  }

  private async renameOntoClaim(workspaceId: string, from: string, to: string): Promise<void> {
    try {
      await this.fs.rename(from, to);
    } catch (moveError) {
      const cleanupError = await this.fs.removeEmptyDirectory(to).then(
        () => null,
        (error: unknown) => error,
      );
      const leftover = cleanupError === null ? "" : ` The empty directory ${to} could not be removed either.`;
      throw new TaskArchiveError(
        `Could not archive workspace ${workspaceId}: moving ${from} to ${to} failed.${leftover}`,
        { cause: cleanupError === null ? moveError : new AggregateError([moveError, cleanupError]) },
      );
    }
  }
}

function skipped(reason: ArchiveSkipReason): ArchiveResult {
  return { kind: "skipped", reason };
}
