import type { PluginScreenParams } from "@getpaseo/plugin/client";

// Long enough for a slow app to mount the screen, short enough that an old history entry does not navigate.
export const OPEN_WORKSPACE_FRESH_MS = 60_000;

export interface OpenWorkspaceVisit {
  token: string;
  createdAt: number;
}

export type OpenWorkspaceParamsResult =
  | { ok: true; workspaceId: string; visit: OpenWorkspaceVisit }
  | { ok: false; message: string };

const VISIT_TOKEN = /^(\d+)\.([a-z0-9]+)$/;

export function createOpenWorkspaceParams(
  workspaceId: string,
  source: { now: number; random: string },
): PluginScreenParams {
  return { workspaceId, visit: `${source.now}.${source.random}` };
}

export function newOpenWorkspaceParams(workspaceId: string): PluginScreenParams {
  return createOpenWorkspaceParams(workspaceId, {
    now: Date.now(),
    random: Math.random().toString(36).slice(2, 10),
  });
}

export function parseOpenWorkspaceParams(params: PluginScreenParams): OpenWorkspaceParamsResult {
  const workspaceId = params.workspaceId;
  if (!workspaceId) return { ok: false, message: "This screen was opened without a workspace." };
  const match = VISIT_TOKEN.exec(params.visit ?? "");
  if (!match?.[1]) return { ok: false, message: "This screen was opened with a broken link." };
  return { ok: true, workspaceId, visit: { token: match[0], createdAt: Number(match[1]) } };
}

/**
 * Remembers which visits of the "open workspace" screen already navigated.
 * Back can show the same screen entry again; it must not navigate a second time.
 */
export class OpenWorkspaceVisits {
  private readonly claimed = new Set<string>();

  claim(visit: OpenWorkspaceVisit, now: number): boolean {
    if (this.claimed.has(visit.token)) return false;
    const age = now - visit.createdAt;
    // The claimed set lives in memory, so after an app reload only the age protects old entries.
    if (age < 0 || age > OPEN_WORKSPACE_FRESH_MS) return false;
    this.claimed.add(visit.token);
    return true;
  }
}
