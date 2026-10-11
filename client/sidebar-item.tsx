import type { PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { LAUNCHER_ICON } from "./ids";
import { NewScratchpadPopover } from "./sidebar-popover";

export function NewScratchpadSidebarItem({ openPopover }: PluginSidebarItemProps) {
  return <SidebarRow icon={LAUNCHER_ICON} onPress={() => openPopover(NewScratchpadPopover)} />;
}
