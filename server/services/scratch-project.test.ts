import { describe, expect, it } from "vitest";
import { RootInsideGitRepositoryError, ScratchProjectNotCreatedError } from "../domain/errors";
import { FakeFileSystem, FakePaseo } from "../testing/fakes";
import { GitRepositoryGuard } from "./git-repository-guard";
import { ScratchProjectService } from "./scratch-project";

const root = "/home/ada/.paseo/scratchpad";

function setup() {
  const fs = new FakeFileSystem();
  const paseo = new FakePaseo();
  const service = new ScratchProjectService({ root, fs, gitGuard: new GitRepositoryGuard({ fs }) });
  return { fs, paseo, service };
}

describe("ScratchProjectService.ensure", () => {
  it("uses the existing project without opening the root again", async () => {
    const { fs, paseo, service } = setup();
    fs.directories.add(root);
    const existing = paseo.addProject(root);

    await expect(service.ensure(paseo)).resolves.toEqual(existing);
    expect(paseo.callsTo("openWorkspace")).toEqual([]);
    expect(paseo.callsTo("archiveWorkspace")).toEqual([]);
  });

  it("creates the root again when it is missing, also when the project exists", async () => {
    const { fs, paseo, service } = setup();
    const existing = paseo.addProject(root);

    await expect(service.ensure(paseo)).resolves.toEqual(existing);
    expect(fs.directories.has(root)).toBe(true);
    expect(paseo.callsTo("openWorkspace")).toEqual([]);
  });

  it("creates the root before it looks up the project", async () => {
    const { fs, paseo, service } = setup();
    paseo.addProject(root);
    fs.failures.set(root, new Error("EACCES"));

    await expect(service.ensure(paseo)).rejects.toThrow("EACCES");
    expect(paseo.calls).toEqual([]);
  });

  it("creates the root, opens it, archives the root workspace and returns the new project", async () => {
    const { fs, paseo, service } = setup();

    const project = await service.ensure(paseo);

    expect(fs.directories.has(root)).toBe(true);
    expect(project.projectRootPath).toBe(root);
    const opened = paseo.callsTo("openWorkspace");
    expect(opened).toEqual([{ method: "openWorkspace", directory: root }]);
    const [rootWorkspace] = [...paseo.workspaces.values()];
    expect(rootWorkspace?.archived).toBe(true);
  });

  it("creates the project again after the user deleted it", async () => {
    const { paseo, service } = setup();
    await service.ensure(paseo);
    paseo.projects.splice(0, paseo.projects.length);

    const project = await service.ensure(paseo);

    expect(project.projectRootPath).toBe(root);
    expect(paseo.callsTo("openWorkspace")).toHaveLength(2);
  });

  it("runs the setup only once for calls at the same time", async () => {
    const { paseo, service } = setup();

    const [first, second] = await Promise.all([service.ensure(paseo), service.ensure(paseo)]);

    expect(first).toEqual(second);
    expect(paseo.callsTo("openWorkspace")).toHaveLength(1);
  });

  it("fails when the project is still missing after setup", async () => {
    const { paseo, service } = setup();
    paseo.openWorkspace = async () => ({ id: "wks_unknown" });
    paseo.archiveWorkspace = async () => {};

    await expect(service.ensure(paseo)).rejects.toBeInstanceOf(ScratchProjectNotCreatedError);
  });

  it("fails before touching Paseo when the root is inside a git repository", async () => {
    const { fs, paseo, service } = setup();
    fs.directories.add("/home/ada/.git");

    await expect(service.ensure(paseo)).rejects.toBeInstanceOf(RootInsideGitRepositoryError);
    expect(paseo.calls).toEqual([]);
    expect(fs.directories.has(root)).toBe(false);
  });

  it("returns errors from Paseo to the caller", async () => {
    const { paseo, service } = setup();
    paseo.archiveWorkspace = async () => {
      throw new Error("archive failed");
    };

    await expect(service.ensure(paseo)).rejects.toThrow("archive failed");
  });
});
