import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const ensureScratchProjectInputSchema = z.object({}).strict();

export const ensureScratchProjectOutputSchema = z.object({
  projectId: z.string().min(1),
});

export const ensureScratchProject = defineRpc({
  name: "scratch.ensure-project",
  input: ensureScratchProjectInputSchema,
  output: ensureScratchProjectOutputSchema,
});

export type EnsureScratchProjectOutput = z.output<typeof ensureScratchProjectOutputSchema>;
