import path from "node:path";
import { TaskDirectoryUnavailableError } from "../domain/errors";
import { numberedName } from "../domain/numbered-name";
import { archivedLocation } from "../domain/task-archive";
import { taskDirectoryBaseName } from "../domain/task-directory-name";
import type { Clock } from "../ports/clock";
import type { FileSystemPort } from "../ports/file-system";

const DEFAULT_MAX_ATTEMPTS = 1000;

export interface TaskDirectoryAllocatorDeps {
  root: string;
  fs: FileSystemPort;
  clock: Clock;
  maxAttempts?: number;
}

export class TaskDirectoryAllocator {
  private readonly root: string;
  private readonly fs: FileSystemPort;
  private readonly clock: Clock;
  private readonly maxAttempts: number;

  constructor(deps: TaskDirectoryAllocatorDeps) {
    this.root = deps.root;
    this.fs = deps.fs;
    this.clock = deps.clock;
    this.maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }

  async allocate({ slug }: { slug?: string }): Promise<string> {
    const baseName = taskDirectoryBaseName({ now: this.clock.now(), slug });
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const directory = path.join(this.root, numberedName(baseName, attempt));
      // A non-recursive mkdir fails when the directory exists, so two requests never get the same one.
      if ((await this.fs.createDirectory(directory)) === "already-exists") continue;
      // Check .archive only after the claim. Checking before it would miss a task that is moved
      // from the root into .archive between the check and the mkdir.
      if (!(await this.fs.exists(archivedLocation(this.root, directory)))) return directory;
      await this.fs.removeEmptyDirectory(directory);
    }
    throw new TaskDirectoryUnavailableError(path.join(this.root, baseName), this.maxAttempts);
  }
}
