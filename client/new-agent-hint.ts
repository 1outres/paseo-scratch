import type { PluginHostProps } from "@getpaseo/plugin/client";

// layout.platform is "web" for both the browser and the desktop app, so it can not tell Mac from other systems.
export function newAgentHint(platform: PluginHostProps["layout"]["platform"]): string {
  if (platform === "web") {
    return 'The workspace opens without an agent. Press Cmd/Ctrl+Shift+A, or choose "New agent", to start one.';
  }
  return 'The workspace opens without an agent. Choose "New agent" to start one.';
}
