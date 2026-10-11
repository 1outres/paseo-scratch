import type { PluginPopoverProps } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { View } from "react-native";
import { OPEN_WORKSPACE_SCREEN_ID } from "./ids";
import { newOpenWorkspaceParams } from "./open-workspace-visit";
import { TaskForm } from "./task-form";

export function NewScratchpadPopover({ theme, layout, close, openScreen }: PluginPopoverProps) {
  const styles = useMemo(() => ({ content: { padding: layout.compact ? 16 : 12 } }), [layout.compact]);

  return (
    <View style={styles.content}>
      <TaskForm
        theme={theme}
        layout={layout}
        onCreated={({ workspaceId }) => {
          // Popovers get no navigation, so a plugin screen opens the workspace for them.
          close();
          openScreen({ screenId: OPEN_WORKSPACE_SCREEN_ID, params: newOpenWorkspaceParams(workspaceId) });
        }}
      />
    </View>
  );
}
