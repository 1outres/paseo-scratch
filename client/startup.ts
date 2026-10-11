export const STARTUP_FAILURE_MESSAGE = "[Scratchpad] Could not set up the scratchpad project when the plugin started.";

export interface StartupDeps {
  ensure: () => Promise<unknown>;
  reportError: (message: string, error: unknown) => void;
}

/** Asks the host to make sure the scratchpad project exists. Returns a cleanup function. */
export function startScratchProjectSetup({ ensure, reportError }: StartupDeps): () => void {
  let active = true;
  ensure().catch((error: unknown) => {
    // Paseo rejects pending RPCs when the plugin stops. That is not a setup failure.
    if (active) reportError(STARTUP_FAILURE_MESSAGE, error);
  });
  return () => {
    active = false;
  };
}
