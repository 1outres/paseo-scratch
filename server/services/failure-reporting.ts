import type { Logger } from "../ports/logger";

/** Logs a failure and rethrows it, for calls whose caller can not show the error to the user. */
export async function reportFailures<Result>(logger: Logger, message: string, run: () => Promise<Result>): Promise<Result> {
  try {
    return await run();
  } catch (error) {
    logger.error(message, error);
    throw error;
  }
}

/** Logs a failure and does not rethrow it, for event handlers that have no caller to report to. */
export async function logFailures(logger: Logger, message: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    logger.error(message, error);
  }
}
