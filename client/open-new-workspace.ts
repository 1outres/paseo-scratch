import type { PluginScreenProps } from "@getpaseo/plugin/client";

export type PluginNavigation = NonNullable<PluginScreenProps["navigation"]>;

export interface CreatedTask {
  workspaceId: string;
}

/** The one place that shows a newly created task workspace. */
export function openNewWorkspace(navigation: PluginNavigation, task: CreatedTask): void {
  navigation.openWorkspace({ workspaceId: task.workspaceId });
}
