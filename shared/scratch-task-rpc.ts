import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const createScratchTaskInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
});

export const createScratchTaskOutputSchema = z.object({
  workspaceId: z.string().min(1),
  directory: z.string().min(1),
});

// RPC names must match /^[a-z][a-z0-9._-]*$/ in Paseo 0.11.2, so "createScratchTask" is not allowed.
export const createScratchTask = defineRpc({
  name: "scratch.create-task",
  input: createScratchTaskInputSchema,
  output: createScratchTaskOutputSchema,
});

export type CreateScratchTaskInput = z.output<typeof createScratchTaskInputSchema>;
export type CreateScratchTaskOutput = z.output<typeof createScratchTaskOutputSchema>;
