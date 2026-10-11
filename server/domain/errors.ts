export class InvalidTaskNameError extends Error {
  override readonly name = "InvalidTaskNameError";
}

export class RootInsideGitRepositoryError extends Error {
  override readonly name = "RootInsideGitRepositoryError";

  constructor(
    readonly root: string,
    readonly repository: string,
  ) {
    super(
      `The scratchpad root ${root} is inside the git repository ${repository}. ` +
        "Paseo would treat it as part of that repository, so the scratchpad can not be used.",
    );
  }
}

export class ScratchProjectNotCreatedError extends Error {
  override readonly name = "ScratchProjectNotCreatedError";

  constructor(readonly root: string) {
    super(`Opened ${root} in Paseo, but no project with this root path was found after that.`);
  }
}

export class TaskDirectoryUnavailableError extends Error {
  override readonly name = "TaskDirectoryUnavailableError";

  constructor(
    readonly baseDirectory: string,
    readonly attempts: number,
  ) {
    super(`Could not create a task directory for ${baseDirectory}: all ${attempts} names are already used.`);
  }
}

export class TaskArchiveError extends Error {
  override readonly name = "TaskArchiveError";
}
