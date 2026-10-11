import { describe, expect, it } from "vitest";
import { InvalidTaskNameError, RootInsideGitRepositoryError } from "../domain/errors";
import { FakeClock, FakeFileSystem, FakePaseo } from "../testing/fakes";
import { CreateScratchTaskService } from "./create-scratch-task";
import { GitRepositoryGuard } from "./git-repository-guard";
import { ScratchProjectService } from "./scratch-project";
import { TaskDirectoryAllocator } from "./task-directory-allocator";

const root = "/home/ada/.paseo/scratchpad";

function setup() {
  const fs = new FakeFileSystem();
  const paseo = new FakePaseo();
  const clock = new FakeClock(new Date(2026, 9, 11, 14, 32));
  const projects = new ScratchProjectService({ root, fs, gitGuard: new GitRepositoryGuard({ fs }) });
  const directories = new TaskDirectoryAllocator({ root, fs, clock });
  const service = new CreateScratchTaskService({ projects, directories });
  return { fs, paseo, service };
}

describe("CreateScratchTaskService.create", () => {
  it("creates a named task workspace with the name as its title", async () => {
    const { fs, paseo, service } = setup();

    const result = await service.create({ name: "CSV パーサ検証" }, paseo);

    const directory = `${root}/2026-10-11-csv-パーサ検証`;
    expect(result).toEqual({ workspaceId: expect.any(String), directory });
    expect(fs.directories.has(directory)).toBe(true);
    const project = paseo.projects.find((p) => p.projectRootPath === root);
    expect(paseo.callsTo("createDirectoryWorkspace")).toEqual([
      {
        method: "createDirectoryWorkspace",
        input: { directory, projectId: project?.projectId, title: "CSV パーサ検証" },
      },
    ]);
  });

  it("creates a task workspace without a title when there is no name", async () => {
    const { paseo, service } = setup();

    const result = await service.create({}, paseo);

    expect(result.directory).toBe(`${root}/2026-10-11-1432`);
    const [call] = paseo.callsTo("createDirectoryWorkspace");
    expect(call).toMatchObject({ input: { directory: result.directory } });
    expect(call && "input" in call ? call.input : null).not.toHaveProperty("title");
  });

  it("makes sure the project exists before creating the task", async () => {
    const { paseo, service } = setup();

    await service.create({}, paseo);

    const methods = paseo.calls.map((call) => call.method);
    expect(methods.indexOf("openWorkspace")).toBeLessThan(methods.indexOf("createDirectoryWorkspace"));
  });

  it("rejects a name without a usable slug before any side effect", async () => {
    const { fs, paseo, service } = setup();

    await expect(service.create({ name: "???" }, paseo)).rejects.toBeInstanceOf(InvalidTaskNameError);
    expect(paseo.calls).toEqual([]);
    expect(fs.directories.size).toBe(0);
  });

  it("fails when the root is inside a git repository", async () => {
    const { fs, paseo, service } = setup();
    fs.directories.add("/home/ada/.git");

    await expect(service.create({}, paseo)).rejects.toBeInstanceOf(RootInsideGitRepositoryError);
    expect(paseo.callsTo("createDirectoryWorkspace")).toEqual([]);
  });
});
