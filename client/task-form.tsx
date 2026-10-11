import type { PluginTheme } from "@getpaseo/plugin";
import { type PluginHostProps, useRpc } from "@getpaseo/plugin/client";
import { TextInput } from "@getpaseo/plugin/client/react-native";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { createScratchTask, type CreateScratchTaskInput } from "../shared/scratch-task-rpc";
import { parseTaskNameField } from "../shared/task-name";
import { newAgentHint } from "./new-agent-hint";
import type { CreatedTask } from "./open-new-workspace";
import { useInitialFocus } from "./use-initial-focus";

export interface TaskFormProps {
  theme: PluginTheme;
  layout: PluginHostProps["layout"];
  /** Called once the task workspace exists. The container decides how to open it. */
  onCreated: (task: CreatedTask) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TaskForm({ theme, layout, onCreated }: TaskFormProps) {
  const compact = layout.compact;
  const createTask = useRpc(createScratchTask);
  const [name, setName] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const nameFocus = useInitialFocus(layout.platform);

  const mutation = useMutation({
    mutationFn: (input: CreateScratchTaskInput) => createTask(input),
    onSuccess: ({ workspaceId }) => {
      setName("");
      onCreated({ workspaceId });
    },
  });

  function submit() {
    if (mutation.isPending) return;
    const parsed = parseTaskNameField(name);
    if (!parsed.ok) {
      setInputError(parsed.message);
      return;
    }
    setInputError(null);
    mutation.mutate(parsed.input);
  }

  const styles = useMemo(
    () => ({
      form: { gap: 8 },
      label: { color: theme.colors.foregroundMuted, fontSize: 13 },
      input: {
        color: theme.colors.foreground,
        backgroundColor: theme.colors.surface1,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
      },
      button: {
        alignSelf: compact ? ("stretch" as const) : ("flex-start" as const),
        alignItems: "center" as const,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: theme.colors.accent,
        opacity: mutation.isPending ? 0.5 : 1,
      },
      buttonText: { color: theme.colors.accentForeground, fontSize: 15 },
      hint: { color: theme.colors.foregroundMuted, fontSize: 13 },
      error: { color: theme.colors.statusDanger, fontSize: 13 },
    }),
    [theme, compact, mutation.isPending],
  );

  const shownError = inputError ?? (mutation.error ? errorMessage(mutation.error) : null);

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Task name (optional)</Text>
      <TextInput
        {...nameFocus}
        accessibilityLabel="Task name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setInputError(null);
        }}
        onSubmitEditing={submit}
        returnKeyType="go"
        editable={!mutation.isPending}
        placeholder="For example: CSV parser test"
        placeholderTextColor={theme.colors.foregroundMuted}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create scratch task"
        accessibilityState={{ disabled: mutation.isPending, busy: mutation.isPending }}
        disabled={mutation.isPending}
        onPress={submit}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{mutation.isPending ? "Creating..." : "Create"}</Text>
      </Pressable>
      {shownError !== null ? <Text style={styles.error}>{shownError}</Text> : null}
      <Text style={styles.hint}>{newAgentHint(layout.platform)}</Text>
    </View>
  );
}
