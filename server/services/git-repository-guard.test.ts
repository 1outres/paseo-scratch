import { describe, expect, it } from "vitest";
import { RootInsideGitRepositoryError } from "../domain/errors";
import { FakeFileSystem } from "../testing/fakes";
import { GitRepositoryGuard } from "./git-repository-guard";

const root = "/home/ada/.paseo/scratchpad";

describe("GitRepositoryGuard", () => {
  it("passes when no parent is a git repository", async () => {
    const guard = new GitRepositoryGuard({ fs: new FakeFileSystem() });
    await expect(guard.assertOutsideRepository(root)).resolves.toBeUndefined();
  });

  it("fails with a clear message when a parent has a .git directory", async () => {
    const fs = new FakeFileSystem();
    fs.directories.add("/home/ada/.git");
    const guard = new GitRepositoryGuard({ fs });
    const error = await guard.assertOutsideRepository(root).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RootInsideGitRepositoryError);
    expect((error as Error).message).toContain(root);
    expect((error as Error).message).toContain("/home/ada");
  });

  it("fails when a parent has a .git file, as in a linked worktree", async () => {
    const fs = new FakeFileSystem();
    fs.files.add("/home/ada/.paseo/.git");
    const guard = new GitRepositoryGuard({ fs });
    await expect(guard.assertOutsideRepository(root)).rejects.toBeInstanceOf(RootInsideGitRepositoryError);
  });
});
