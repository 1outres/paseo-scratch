import { access, mkdir, rename, rmdir, stat } from "node:fs/promises";
import type { CreateDirectoryResult, FileSystemPort } from "../ports/file-system";

function hasErrorCode(error: unknown, ...codes: string[]): boolean {
  return error instanceof Error && codes.includes((error as NodeJS.ErrnoException).code ?? "");
}

export const nodeFileSystem: FileSystemPort = {
  async createDirectory(path: string): Promise<CreateDirectoryResult> {
    try {
      await mkdir(path);
      return "created";
    } catch (error) {
      if (hasErrorCode(error, "EEXIST")) return "already-exists";
      throw error;
    }
  },

  async ensureDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  },

  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error) {
      if (hasErrorCode(error, "ENOENT", "ENOTDIR")) return false;
      throw error;
    }
  },

  async isDirectory(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isDirectory();
    } catch (error) {
      if (hasErrorCode(error, "ENOENT", "ENOTDIR")) return false;
      throw error;
    }
  },

  async rename(from: string, to: string): Promise<void> {
    await rename(from, to);
  },

  async removeEmptyDirectory(path: string): Promise<void> {
    await rmdir(path);
  },
};
