import { describe, expect, it } from "vitest";
import { archiveDestination, archivedLocation, isDirectoryInUse, isTaskDirectory } from "./task-archive";

const root = "/home/ada/.paseo/scratchpad";

describe("isTaskDirectory", () => {
  it("is true for a direct child of the root", () => {
    expect(isTaskDirectory(`${root}/2026-10-11-1432`, root)).toBe(true);
  });

  it("accepts a trailing slash", () => {
    expect(isTaskDirectory(`${root}/2026-10-11-1432/`, root)).toBe(true);
  });

  it("is false for the root itself", () => {
    expect(isTaskDirectory(root, root)).toBe(false);
    expect(isTaskDirectory(`${root}/`, root)).toBe(false);
  });

  it("is false for the .archive directory", () => {
    expect(isTaskDirectory(`${root}/.archive`, root)).toBe(false);
  });

  it("is false for a directory inside .archive", () => {
    expect(isTaskDirectory(`${root}/.archive/2026-10-11-1432`, root)).toBe(false);
  });

  it("is false for a deeper directory in a task", () => {
    expect(isTaskDirectory(`${root}/2026-10-11-1432/sub`, root)).toBe(false);
  });

  it("is false for a directory outside the root", () => {
    expect(isTaskDirectory("/code/app", root)).toBe(false);
    expect(isTaskDirectory("/home/ada/.paseo/scratchpad-other", root)).toBe(false);
  });
});

describe("isDirectoryInUse", () => {
  const directory = `${root}/2026-10-11-1432`;

  it("is false when no other workspace uses the directory", () => {
    expect(isDirectoryInUse(directory, "w1", [{ id: "w2", directory: `${root}/other` }])).toBe(false);
  });

  it("is true when another workspace uses the same directory", () => {
    expect(isDirectoryInUse(directory, "w1", [{ id: "w2", directory: `${directory}/` }])).toBe(true);
  });

  it("ignores the archived workspace itself", () => {
    expect(isDirectoryInUse(directory, "w1", [{ id: "w1", directory }])).toBe(false);
  });

  it("does not count a workspace in a subdirectory", () => {
    expect(isDirectoryInUse(directory, "w1", [{ id: "w2", directory: `${directory}/sub` }])).toBe(false);
  });
});

describe("archiveDestination", () => {
  it("puts the directory into .archive with the same name", () => {
    expect(archiveDestination(root, `${root}/2026-10-11-csv`, 1)).toBe(`${root}/.archive/2026-10-11-csv`);
  });

  it("adds -2, -3 for later attempts", () => {
    expect(archiveDestination(root, `${root}/2026-10-11-csv`, 2)).toBe(`${root}/.archive/2026-10-11-csv-2`);
  });
});

describe("archivedLocation", () => {
  it("is the same name inside .archive", () => {
    expect(archivedLocation(root, `${root}/2026-10-11-1432`)).toBe(`${root}/.archive/2026-10-11-1432`);
  });
});
