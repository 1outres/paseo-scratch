import { describe, expect, it } from "vitest";
import { TaskDirectoryUnavailableError } from "../domain/errors";
import { FakeClock, FakeFileSystem } from "../testing/fakes";
import { TaskDirectoryAllocator } from "./task-directory-allocator";

const root = "/home/ada/.paseo/scratchpad";

function setup(options: { maxAttempts?: number } = {}) {
  const fs = new FakeFileSystem();
  fs.directories.add(root);
  const clock = new FakeClock(new Date(2026, 9, 11, 14, 32));
  const allocator = new TaskDirectoryAllocator({ root, fs, clock, ...options });
  return { fs, clock, allocator };
}

describe("TaskDirectoryAllocator.allocate", () => {
  it("creates a directory named after the date and the slug", async () => {
    const { fs, allocator } = setup();
    const directory = await allocator.allocate({ slug: "csv-パーサ検証" });
    expect(directory).toBe(`${root}/2026-10-11-csv-パーサ検証`);
    expect(fs.directories.has(directory)).toBe(true);
  });

  it("creates a directory named after the date and the time without a slug", async () => {
    const { allocator } = setup();
    await expect(allocator.allocate({})).resolves.toBe(`${root}/2026-10-11-1432`);
  });

  it("adds -2, -3 when the directory already exists", async () => {
    const { allocator } = setup();
    await allocator.allocate({});
    await expect(allocator.allocate({})).resolves.toBe(`${root}/2026-10-11-1432-2`);
    await expect(allocator.allocate({})).resolves.toBe(`${root}/2026-10-11-1432-3`);
  });

  it("reads the clock for every call", async () => {
    const { clock, allocator } = setup();
    await allocator.allocate({});
    clock.set(new Date(2026, 9, 11, 14, 33));
    await expect(allocator.allocate({})).resolves.toBe(`${root}/2026-10-11-1433`);
  });

  it("returns other mkdir errors to the caller", async () => {
    const { fs, allocator } = setup();
    fs.failures.set(`${root}/2026-10-11-1432`, new Error("EACCES"));
    await expect(allocator.allocate({})).rejects.toThrow("EACCES");
  });

  it("fails when the root does not exist", async () => {
    const { fs, allocator } = setup();
    fs.directories.delete(root);
    await expect(allocator.allocate({})).rejects.toThrow("ENOENT");
  });

  it("skips a name that is used only in .archive, so names are never reused", async () => {
    const { fs, allocator } = setup();
    fs.directories.add(`${root}/.archive`);
    fs.directories.add(`${root}/.archive/2026-10-11-1432`);

    await expect(allocator.allocate({})).resolves.toBe(`${root}/2026-10-11-1432-2`);
    expect(fs.directories.has(`${root}/2026-10-11-1432`)).toBe(false);
  });

  it("skips a name used in .archive with a slug too", async () => {
    const { fs, allocator } = setup();
    fs.directories.add(`${root}/.archive`);
    fs.directories.add(`${root}/.archive/2026-10-11-csv`);
    fs.directories.add(`${root}/.archive/2026-10-11-csv-2`);

    await expect(allocator.allocate({ slug: "csv" })).resolves.toBe(`${root}/2026-10-11-csv-3`);
  });

  it("checks .archive after the claim, so a task archived at that moment still blocks the name", async () => {
    const { fs, allocator } = setup();
    fs.onCreateDirectory = (target) => {
      if (target === `${root}/2026-10-11-1432`) {
        fs.directories.add(`${root}/.archive`);
        fs.directories.add(`${root}/.archive/2026-10-11-1432`);
      }
    };

    await expect(allocator.allocate({})).resolves.toBe(`${root}/2026-10-11-1432-2`);
    expect(fs.directories.has(`${root}/2026-10-11-1432`)).toBe(false);
  });

  it("gives different names to requests at the same time", async () => {
    const { allocator } = setup();
    const names = await Promise.all([allocator.allocate({}), allocator.allocate({}), allocator.allocate({})]);
    expect(new Set(names).size).toBe(3);
  });

  it("returns the error when it can not release a claimed name", async () => {
    const { fs, allocator } = setup();
    fs.directories.add(`${root}/.archive`);
    fs.directories.add(`${root}/.archive/2026-10-11-1432`);
    fs.onCreateDirectory = (target) => {
      if (target === `${root}/2026-10-11-1432`) fs.files.add(`${target}/surprise`);
    };

    await expect(allocator.allocate({})).rejects.toThrow("ENOTEMPTY");
  });

  it("stops after the maximum number of attempts", async () => {
    const { allocator } = setup({ maxAttempts: 2 });
    await allocator.allocate({});
    await allocator.allocate({});
    await expect(allocator.allocate({})).rejects.toBeInstanceOf(TaskDirectoryUnavailableError);
  });
});
