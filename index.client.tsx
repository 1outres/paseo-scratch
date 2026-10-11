import type { PluginClientContext } from "@getpaseo/plugin/client";
import {
  LAUNCHER_ICON,
  LAUNCHER_SCREEN_ID,
  LAUNCHER_TITLE,
  OPEN_WORKSPACE_SCREEN_ID,
  OPEN_WORKSPACE_TITLE,
} from "./client/ids";
import { LauncherScreen } from "./client/launcher-screen";
import { OpenWorkspaceScreen } from "./client/open-workspace-screen";
import { NewScratchpadSidebarItem } from "./client/sidebar-item";
import { startScratchProjectSetup } from "./client/startup";
import { ensureScratchProject } from "./shared/scratch-project-rpc";

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: LAUNCHER_SCREEN_ID, title: LAUNCHER_TITLE, Component: LauncherScreen });
  client.addScreen({ id: OPEN_WORKSPACE_SCREEN_ID, title: OPEN_WORKSPACE_TITLE, Component: OpenWorkspaceScreen });
  client.addSidebarHeaderItem({ id: "new-scratchpad", title: LAUNCHER_TITLE, Component: NewScratchpadSidebarItem });
  client.addCommandCenterItem({
    id: "new-scratchpad",
    title: LAUNCHER_TITLE,
    icon: LAUNCHER_ICON,
    keywords: ["scratch", "scratchpad", "task", "new"],
    context: "global",
    onSelect: ({ openScreen }) => openScreen({ screenId: LAUNCHER_SCREEN_ID }),
  });

  const stopSetup = startScratchProjectSetup({
    ensure: () => client.rpc(ensureScratchProject, {}),
    reportError: (message, error) => console.error(message, error),
  });

  return () => {
    stopSetup();
  };
}
