import path from "node:path";

export const SCRATCH_DIRECTORY_NAME = "scratchpad";

export interface PaseoHomeInput {
  paseoHomeEnv: string | undefined;
  homeDirectory: string;
  cwd: string;
}

function expandHomeDirectory(value: string, homeDirectory: string): string {
  if (value === "~") return homeDirectory;
  if (value.startsWith("~/")) return path.join(homeDirectory, value.slice(2));
  return value;
}

/** Same rule as resolvePaseoHome in the Paseo 0.11.2 daemon (server/paseo-home.js). */
export function resolvePaseoHome({ paseoHomeEnv, homeDirectory, cwd }: PaseoHomeInput): string {
  const raw = paseoHomeEnv ?? "~/.paseo";
  return path.resolve(cwd, expandHomeDirectory(raw, homeDirectory));
}

export function resolveScratchRoot(input: PaseoHomeInput): string {
  return path.join(resolvePaseoHome(input), SCRATCH_DIRECTORY_NAME);
}
