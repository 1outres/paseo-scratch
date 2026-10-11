import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { NAVIGATION_UNAVAILABLE_MESSAGE } from "./launcher-screen";
import { openNewWorkspace } from "./open-new-workspace";
import { OpenWorkspaceVisits, parseOpenWorkspaceParams } from "./open-workspace-visit";

const visits = new OpenWorkspaceVisits();

type ScreenState = "opening" | "opened";

export function OpenWorkspaceScreen({ theme, layout, navigation, params }: PluginScreenProps) {
  const workspaceIdParam = params.workspaceId;
  const visitParam = params.visit;
  // Key on the raw strings: the params object may be a new object on every render.
  const parsed = useMemo(() => parseOpenWorkspaceParams(params), [workspaceIdParam, visitParam]);
  const [state, setState] = useState<ScreenState>("opening");

  useEffect(() => {
    if (!parsed.ok || navigation === undefined) return;
    if (visits.claim(parsed.visit, Date.now())) {
      openNewWorkspace(navigation, { workspaceId: parsed.workspaceId });
    }
    // The screen may stay mounted under the workspace, so Back must find the button view, not "Opening".
    setState("opened");
  }, [parsed, navigation]);

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        gap: 12,
        backgroundColor: theme.colors.surface0,
      },
      text: { color: theme.colors.foreground, fontSize: 15 },
      error: { color: theme.colors.statusDanger, fontSize: 13 },
      button: {
        alignSelf: layout.compact ? ("stretch" as const) : ("flex-start" as const),
        alignItems: "center" as const,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: theme.colors.accent,
      },
      buttonText: { color: theme.colors.accentForeground, fontSize: 15 },
    }),
    [theme, layout.compact],
  );

  if (!parsed.ok) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{parsed.message}</Text>
      </View>
    );
  }
  if (navigation === undefined) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{NAVIGATION_UNAVAILABLE_MESSAGE}</Text>
      </View>
    );
  }
  if (state === "opening") {
    return (
      <View style={styles.screen}>
        <Text style={styles.text}>Opening the new workspace...</Text>
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>The scratch task workspace was opened.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open the scratch task workspace"
        onPress={() => openNewWorkspace(navigation, { workspaceId: parsed.workspaceId })}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Open workspace</Text>
      </Pressable>
    </View>
  );
}
