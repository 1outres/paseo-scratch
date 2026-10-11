export type CreateDirectoryResult = "created" | "already-exists";

export interface FileSystemPort {
  /** Non-recursive mkdir. Other errors than "already exists" are thrown. */
  createDirectory(path: string): Promise<CreateDirectoryResult>;
  /** Recursive mkdir. Does nothing when the directory exists. */
  ensureDirectory(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** False for a missing path or a path that is not a directory. */
  isDirectory(path: string): Promise<boolean>;
  /** Moves a directory. The target may be an empty directory, which is replaced. */
  rename(from: string, to: string): Promise<void>;
  removeEmptyDirectory(path: string): Promise<void>;
}
