import path from "node:path";
import type { ActiveWorkspace } from "../ports/paseo";
import { numberedName } from "./numbered-name";

export const ARCHIVE_DIRECTORY_NAME = ".archive";

/** A task directory is a direct child of the root, other than `.archive`. */
export function isTaskDirectory(directory: string, root: string): boolean {
  const resolved = path.resolve(directory);
  return path.dirname(resolved) === path.resolve(root) && path.basename(resolved) !== ARCHIVE_DIRECTORY_NAME;
}

export function isDirectoryInUse(
  directory: string,
  archivedWorkspaceId: string,
  activeWorkspaces: readonly ActiveWorkspace[],
): boolean {
  const target = path.resolve(directory);
  return activeWorkspaces.some(
    (workspace) => workspace.id !== archivedWorkspaceId && path.resolve(workspace.directory) === target,
  );
}

export function archiveDestination(root: string, taskDirectory: string, attempt: number): string {
  return path.join(root, ARCHIVE_DIRECTORY_NAME, numberedName(path.basename(path.resolve(taskDirectory)), attempt));
}

/** Where a task directory goes when archived without a suffix. */
export function archivedLocation(root: string, taskDirectory: string): string {
  return archiveDestination(root, taskDirectory, 1);
}
