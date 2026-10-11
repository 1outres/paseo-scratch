import { describe, expect, it } from "vitest";
import type { WorkspaceCreateRequest } from "../ports/paseo";
import { FakeClock, FakeFileSystem, FakePaseo } from "../testing/fakes";
import { GitRepositoryGuard } from "./git-repository-guard";
import { ScratchProjectService } from "./scratch-project";
import { TaskDirectoryAllocator } from "./task-directory-allocator";
import { WorkspaceCreateRewriter } from "./workspace-create-rewriter";

const root = "/home/ada/.paseo/scratchpad";

function setup() {
  const fs = new FakeFileSystem();
  const paseo = new FakePaseo();
  const clock = new FakeClock(new Date(2026, 9, 11, 14, 32));
  const projects = new ScratchProjectService({ root, fs, gitGuard: new GitRepositoryGuard({ fs }) });
  const directories = new TaskDirectoryAllocator({ root, fs, clock });
  const rewriter = new WorkspaceCreateRewriter({ root, projects, directories });
  return { fs, paseo, rewriter };
}

function request(source: WorkspaceCreateRequest["source"]): WorkspaceCreateRequest {
  return { firstAgentContext: { prompt: "hello" }, source } as WorkspaceCreateRequest;
}

describe("WorkspaceCreateRewriter.rewrite", () => {
  it("leaves requests for other directories unchanged", async () => {
    const { fs, paseo, rewriter } = setup();

    await expect(rewriter.rewrite(request({ kind: "directory", path: "/code/app" }), paseo)).resolves.toBeUndefined();
    expect(paseo.calls).toEqual([]);
    expect(fs.directories.size).toBe(0);
  });

  it("leaves the plugin's own task workspace requests unchanged", async () => {
    const { paseo, rewriter } = setup();
    const own = request({ kind: "directory", path: `${root}/2026-10-11-1432`, projectId: "p1" });

    await expect(rewriter.rewrite(own, paseo)).resolves.toBeUndefined();
  });

  it("moves a request for the root into a new task directory of the existing project", async () => {
    const { fs, paseo, rewriter } = setup();
    fs.directories.add(root);
    const project = paseo.addProject(root);

    const next = await rewriter.rewrite(
      request({ kind: "directory", path: root, projectId: project.projectId }),
      paseo,
    );

    const directory = `${root}/2026-10-11-1432`;
    expect(next).toEqual({
      firstAgentContext: { prompt: "hello" },
      source: { kind: "directory", path: directory, projectId: project.projectId },
    });
    expect(fs.directories.has(directory)).toBe(true);
  });

  it("creates the project and sets the projectId when it is missing", async () => {
    const { paseo, rewriter } = setup();

    const next = await rewriter.rewrite(request({ kind: "directory", path: root }), paseo);

    const project = paseo.projects.find((p) => p.projectRootPath === root);
    expect(project).toBeDefined();
    expect(next?.source).toEqual({
      kind: "directory",
      path: `${root}/2026-10-11-1432`,
      projectId: project?.projectId,
    });
  });

  it("throws when mkdir fails, so the workspace is not created", async () => {
    const { fs, paseo, rewriter } = setup();
    fs.directories.add(root);
    paseo.addProject(root);
    fs.failures.set(`${root}/2026-10-11-1432`, new Error("EACCES"));

    await expect(rewriter.rewrite(request({ kind: "directory", path: root }), paseo)).rejects.toThrow("EACCES");
  });
});
