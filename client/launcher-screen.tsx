import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { openNewWorkspace } from "./open-new-workspace";
import { TaskForm } from "./task-form";

export const NAVIGATION_UNAVAILABLE_MESSAGE =
  "This Paseo app can not open workspaces from a plugin screen. Update the app.";

export function LauncherScreen({ theme, layout, navigation }: PluginScreenProps) {
  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        backgroundColor: theme.colors.surface0,
      },
      content: { maxWidth: layout.compact ? undefined : 560 },
      error: { color: theme.colors.statusDanger, fontSize: 13 },
    }),
    [theme, layout.compact],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {navigation === undefined ? (
          <Text style={styles.error}>{NAVIGATION_UNAVAILABLE_MESSAGE}</Text>
        ) : (
          <TaskForm theme={theme} layout={layout} onCreated={(task) => openNewWorkspace(navigation, task)} />
        )}
      </View>
    </View>
  );
}
