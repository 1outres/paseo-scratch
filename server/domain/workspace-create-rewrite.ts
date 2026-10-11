import path from "node:path";
import type { WorkspaceCreateRequest } from "../ports/paseo";

type DirectorySource = Extract<WorkspaceCreateRequest["source"], { kind: "directory" }>;

export type RootDirectoryRequest = WorkspaceCreateRequest & { source: DirectorySource };

export function targetsScratchRoot(request: WorkspaceCreateRequest, root: string): request is RootDirectoryRequest {
  return request.source.kind === "directory" && path.resolve(request.source.path) === path.resolve(root);
}

/** Moves the request to the task directory. Keeps every other field, including a given projectId. */
export function redirectToTaskDirectory(
  request: RootDirectoryRequest,
  target: { taskDirectory: string; projectId: string },
): WorkspaceCreateRequest {
  return {
    ...request,
    source: {
      ...request.source,
      path: target.taskDirectory,
      projectId: request.source.projectId ?? target.projectId,
    },
  };
}
