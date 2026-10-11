import { describe, expect, it } from "vitest";
import { findEnclosingGitRepository, gitEntryCandidates } from "./git-repository";

describe("gitEntryCandidates", () => {
  it("lists the .git entry of the root and of every parent, nearest first", () => {
    expect(gitEntryCandidates("/home/ada/.paseo/scratchpad")).toEqual([
      { directory: "/home/ada/.paseo/scratchpad", gitEntry: "/home/ada/.paseo/scratchpad/.git" },
      { directory: "/home/ada/.paseo", gitEntry: "/home/ada/.paseo/.git" },
      { directory: "/home/ada", gitEntry: "/home/ada/.git" },
      { directory: "/home", gitEntry: "/home/.git" },
      { directory: "/", gitEntry: "/.git" },
    ]);
  });
});

describe("findEnclosingGitRepository", () => {
  const root = "/home/ada/.paseo/scratchpad";

  it("returns null when no directory has a .git entry", () => {
    expect(findEnclosingGitRepository(root, new Set())).toBeNull();
  });

  it("finds a repository in a parent directory", () => {
    expect(findEnclosingGitRepository(root, new Set(["/home/ada/.git"]))).toBe("/home/ada");
  });

  it("finds a repository at the root itself", () => {
    expect(findEnclosingGitRepository(root, new Set([`${root}/.git`]))).toBe(root);
  });

  it("returns the nearest repository", () => {
    const existing = new Set(["/home/ada/.git", "/home/ada/.paseo/.git"]);
    expect(findEnclosingGitRepository(root, existing)).toBe("/home/ada/.paseo");
  });
});
