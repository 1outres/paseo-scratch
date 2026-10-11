import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nodeFileSystem } from "./node-file-system";

let base: string;

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), "paseo-scratch-fs-"));
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe("nodeFileSystem", () => {
  it("creates a directory and reports an existing one", async () => {
    const target = path.join(base, "task");
    await expect(nodeFileSystem.createDirectory(target)).resolves.toBe("created");
    await expect(nodeFileSystem.createDirectory(target)).resolves.toBe("already-exists");
  });

  it("does not create missing parents in createDirectory", async () => {
    await expect(nodeFileSystem.createDirectory(path.join(base, "a", "b"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("creates missing parents in ensureDirectory", async () => {
    const target = path.join(base, "a", "b");
    await nodeFileSystem.ensureDirectory(target);
    await nodeFileSystem.ensureDirectory(target);
    await expect(nodeFileSystem.exists(target)).resolves.toBe(true);
  });

  it("reports files and missing paths", async () => {
    const file = path.join(base, ".git");
    await writeFile(file, "gitdir: elsewhere\n");
    await expect(nodeFileSystem.exists(file)).resolves.toBe(true);
    await expect(nodeFileSystem.exists(path.join(base, "missing"))).resolves.toBe(false);
    await expect(nodeFileSystem.exists(path.join(file, "below-a-file"))).resolves.toBe(false);
  });
});

describe("nodeFileSystem directories and moves", () => {
  it("tells directories apart from files and missing paths", async () => {
    const file = path.join(base, "file");
    await writeFile(file, "x");
    await expect(nodeFileSystem.isDirectory(base)).resolves.toBe(true);
    await expect(nodeFileSystem.isDirectory(file)).resolves.toBe(false);
    await expect(nodeFileSystem.isDirectory(path.join(base, "missing"))).resolves.toBe(false);
  });

  it("renames a directory onto an empty directory it claimed", async () => {
    const source = path.join(base, "task");
    const target = path.join(base, "claimed");
    await nodeFileSystem.createDirectory(source);
    await writeFile(path.join(source, "main.py"), "print(1)");
    await nodeFileSystem.createDirectory(target);

    await nodeFileSystem.rename(source, target);

    await expect(nodeFileSystem.exists(path.join(target, "main.py"))).resolves.toBe(true);
    await expect(nodeFileSystem.exists(source)).resolves.toBe(false);
  });

  it("does not rename onto a directory that has files", async () => {
    const source = path.join(base, "task");
    const target = path.join(base, "full");
    await nodeFileSystem.createDirectory(source);
    await nodeFileSystem.createDirectory(target);
    await writeFile(path.join(target, "other"), "x");

    await expect(nodeFileSystem.rename(source, target)).rejects.toThrow();
    await expect(nodeFileSystem.exists(source)).resolves.toBe(true);
  });

  it("removes only an empty directory", async () => {
    const empty = path.join(base, "empty");
    const full = path.join(base, "full");
    await nodeFileSystem.createDirectory(empty);
    await nodeFileSystem.createDirectory(full);
    await writeFile(path.join(full, "x"), "x");

    await nodeFileSystem.removeEmptyDirectory(empty);
    await expect(nodeFileSystem.exists(empty)).resolves.toBe(false);
    await expect(nodeFileSystem.removeEmptyDirectory(full)).rejects.toThrow();
  });
});
