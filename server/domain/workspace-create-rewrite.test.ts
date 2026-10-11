import { describe, expect, it } from "vitest";
import type { WorkspaceCreateRequest } from "../ports/paseo";
import { redirectToTaskDirectory, targetsScratchRoot } from "./workspace-create-rewrite";

const root = "/home/ada/.paseo/scratchpad";

function appRequest<Source extends WorkspaceCreateRequest["source"]>(
  source: Source,
): WorkspaceCreateRequest & { source: Source } {
  return {
    agent: {
      config: { provider: "claude", cwd: root },
      initialPrompt: "hello",
      clientMessageId: "m1",
      labels: {},
    },
    subscribe: true,
    idempotencyKey: "k1",
    firstAgentContext: { prompt: "hello" },
    source,
  } as WorkspaceCreateRequest & { source: Source };
}

describe("targetsScratchRoot", () => {
  it("is true for a directory source at the root", () => {
    expect(targetsScratchRoot(appRequest({ kind: "directory", path: root, projectId: "p1" }), root)).toBe(true);
  });

  it("is true when the path has a trailing slash", () => {
    expect(targetsScratchRoot(appRequest({ kind: "directory", path: `${root}/` }), root)).toBe(true);
  });

  it("is false for a task directory under the root", () => {
    const request = appRequest({ kind: "directory", path: `${root}/2026-10-11-1432`, projectId: "p1" });
    expect(targetsScratchRoot(request, root)).toBe(false);
  });

  it("is false for another directory", () => {
    expect(targetsScratchRoot(appRequest({ kind: "directory", path: "/code/app" }), root)).toBe(false);
  });

  it("is false for a worktree source", () => {
    expect(targetsScratchRoot(appRequest({ kind: "worktree", cwd: root }), root)).toBe(false);
  });
});

describe("redirectToTaskDirectory", () => {
  const taskDirectory = `${root}/2026-10-11-1432`;

  it("changes only the source path and keeps an existing projectId", () => {
    const request = appRequest({ kind: "directory", path: root, projectId: "p1" });
    const next = redirectToTaskDirectory(request, { taskDirectory, projectId: "p-scratch" });
    expect(next).toEqual({
      ...request,
      source: { kind: "directory", path: taskDirectory, projectId: "p1" },
    });
  });

  it("sets the projectId when it is missing", () => {
    const request = appRequest({ kind: "directory", path: root });
    const next = redirectToTaskDirectory(request, { taskDirectory, projectId: "p-scratch" });
    expect(next.source).toEqual({ kind: "directory", path: taskDirectory, projectId: "p-scratch" });
  });

  it("does not set a title", () => {
    const request = appRequest({ kind: "directory", path: root });
    const next = redirectToTaskDirectory(request, { taskDirectory, projectId: "p-scratch" });
    expect(next).not.toHaveProperty("title");
  });

  it("does not change the original request", () => {
    const request = appRequest({ kind: "directory", path: root });
    redirectToTaskDirectory(request, { taskDirectory, projectId: "p-scratch" });
    expect(request.source).toEqual({ kind: "directory", path: root });
  });
});
