import { describe, expect, it } from "vitest";
import { TaskArchiveError } from "../domain/errors";
import { FakeFileSystem, FakePaseo } from "../testing/fakes";
import { TaskArchiver } from "./task-archiver";

const root = "/home/ada/.paseo/scratchpad";
const taskDirectory = `${root}/2026-10-11-csv`;

function setup() {
  const fs = new FakeFileSystem();
  fs.directories.add(root);
  fs.directories.add(taskDirectory);
  fs.files.add(`${taskDirectory}/main.py`);
  const paseo = new FakePaseo();
  const project = paseo.addProject(root);
  const archiver = new TaskArchiver({ root, fs, maxAttempts: 3 });
  const archived = { id: "wks_archived", projectId: project.projectId, cwd: taskDirectory };
  return { fs, paseo, project, archiver, archived };
}

describe("TaskArchiver.handleWorkspaceArchived", () => {
  it("moves the task directory into .archive", async () => {
    const { fs, paseo, archiver, archived } = setup();

    const result = await archiver.handleWorkspaceArchived(archived, paseo);

    const destination = `${root}/.archive/2026-10-11-csv`;
    expect(result).toEqual({ kind: "moved", from: taskDirectory, to: destination });
    expect(fs.directories.has(taskDirectory)).toBe(false);
    expect(fs.directories.has(destination)).toBe(true);
    expect(fs.files.has(`${destination}/main.py`)).toBe(true);
  });

  it("adds -2 when the name is already used in .archive", async () => {
    const { fs, paseo, archiver, archived } = setup();
    fs.directories.add(`${root}/.archive`);
    fs.directories.add(`${root}/.archive/2026-10-11-csv`);

    const result = await archiver.handleWorkspaceArchived(archived, paseo);

    expect(result).toEqual({ kind: "moved", from: taskDirectory, to: `${root}/.archive/2026-10-11-csv-2` });
    expect(fs.directories.has(`${root}/.archive/2026-10-11-csv`)).toBe(true);
  });

  it("never moves the root, so the root workspace archived by project setup stays", async () => {
    const { fs, paseo, project, archiver } = setup();

    const result = await archiver.handleWorkspaceArchived(
      { id: "wks_root", projectId: project.projectId, cwd: root },
      paseo,
    );

    expect(result).toEqual({ kind: "skipped", reason: "not-a-task-directory" });
    expect(paseo.calls).toEqual([]);
    expect(fs.directories.has(root)).toBe(true);
  });

  it("does not move a directory inside .archive", async () => {
    const { paseo, project, archiver } = setup();

    const result = await archiver.handleWorkspaceArchived(
      { id: "w", projectId: project.projectId, cwd: `${root}/.archive/2026-10-11-csv` },
      paseo,
    );

    expect(result).toEqual({ kind: "skipped", reason: "not-a-task-directory" });
  });

  it("does not move a workspace of another project", async () => {
    const { fs, paseo, archiver, archived } = setup();

    const result = await archiver.handleWorkspaceArchived({ ...archived, projectId: "prj_other" }, paseo);

    expect(result).toEqual({ kind: "skipped", reason: "not-scratchpad-project" });
    expect(fs.directories.has(taskDirectory)).toBe(true);
  });

  it("treats a missing scratchpad project as not ours and does not create it", async () => {
    const { paseo, archiver, archived } = setup();
    paseo.projects.splice(0, paseo.projects.length);

    const result = await archiver.handleWorkspaceArchived(archived, paseo);

    expect(result).toEqual({ kind: "skipped", reason: "not-scratchpad-project" });
    expect(paseo.callsTo("openWorkspace")).toEqual([]);
  });

  it("does not move a directory that another active workspace uses", async () => {
    const { fs, paseo, project, archiver, archived } = setup();
    paseo.addDirectoryWorkspace({ projectId: project.projectId, directory: taskDirectory });

    const result = await archiver.handleWorkspaceArchived(archived, paseo);

    expect(result).toEqual({ kind: "skipped", reason: "directory-in-use" });
    expect(fs.directories.has(taskDirectory)).toBe(true);
  });

  it("does nothing when the directory does not exist", async () => {
    const { fs, paseo, archiver, archived } = setup();
    fs.directories.delete(taskDirectory);

    const result = await archiver.handleWorkspaceArchived(archived, paseo);

    expect(result).toEqual({ kind: "skipped", reason: "directory-missing" });
    expect(fs.directories.has(`${root}/.archive`)).toBe(false);
  });

  it("fails with the paths when the move fails, and removes the claimed destination", async () => {
    const { fs, paseo, archiver, archived } = setup();
    fs.renameFailure = new Error("EXDEV");

    const error = await archiver.handleWorkspaceArchived(archived, paseo).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TaskArchiveError);
    expect((error as Error).message).toContain("wks_archived");
    expect((error as Error).message).toContain(taskDirectory);
    expect((error as Error).message).toContain(`${root}/.archive/2026-10-11-csv`);
    expect(fs.directories.has(`${root}/.archive/2026-10-11-csv`)).toBe(false);
    expect(fs.directories.has(taskDirectory)).toBe(true);
  });

  it("fails when all destination names are used", async () => {
    const { fs, paseo, archiver, archived } = setup();
    fs.directories.add(`${root}/.archive`);
    for (const name of ["2026-10-11-csv", "2026-10-11-csv-2", "2026-10-11-csv-3"]) {
      fs.directories.add(`${root}/.archive/${name}`);
    }

    await expect(archiver.handleWorkspaceArchived(archived, paseo)).rejects.toBeInstanceOf(TaskArchiveError);
    expect(fs.directories.has(taskDirectory)).toBe(true);
  });
});
