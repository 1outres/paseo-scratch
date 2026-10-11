import type { Logger } from "../ports/logger";

// Paseo shows the plugin's stderr in Settings > Plugins > Logs and in `paseo plugin logs`.
export const consoleLogger: Logger = {
  error: (message, error) => console.error(`[scratchpad] ${message}`, error),
};
