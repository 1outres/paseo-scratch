import path from "node:path";

export interface GitEntryCandidate {
  directory: string;
  gitEntry: string;
}

/** The root and all its parents, nearest first, each with the `.git` path git would look for. */
export function gitEntryCandidates(root: string): GitEntryCandidate[] {
  const candidates: GitEntryCandidate[] = [];
  let directory = path.resolve(root);
  for (;;) {
    candidates.push({ directory, gitEntry: path.join(directory, ".git") });
    const parent = path.dirname(directory);
    if (parent === directory) return candidates;
    directory = parent;
  }
}

export function findEnclosingGitRepository(root: string, existingGitEntries: ReadonlySet<string>): string | null {
  const match = gitEntryCandidates(root).find((candidate) => existingGitEntries.has(candidate.gitEntry));
  return match?.directory ?? null;
}
