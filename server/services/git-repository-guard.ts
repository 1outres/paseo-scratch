import { RootInsideGitRepositoryError } from "../domain/errors";
import { findEnclosingGitRepository, gitEntryCandidates } from "../domain/git-repository";
import type { FileSystemPort } from "../ports/file-system";

export class GitRepositoryGuard {
  private readonly fs: FileSystemPort;

  constructor(deps: { fs: FileSystemPort }) {
    this.fs = deps.fs;
  }

  async assertOutsideRepository(root: string): Promise<void> {
    const existing = new Set<string>();
    for (const { gitEntry } of gitEntryCandidates(root)) {
      if (await this.fs.exists(gitEntry)) existing.add(gitEntry);
    }
    const repository = findEnclosingGitRepository(root, existing);
    if (repository !== null) throw new RootInsideGitRepositoryError(root, repository);
  }
}
