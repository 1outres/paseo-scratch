import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { describe, expect, it, vi } from "vitest";
import { createPaseoPort, PaseoOperationError } from "./paseo-sdk";

type PaseoApi = PluginHandlerContext["paseo"];

function stubPaseo(parts: Record<string, unknown>): PaseoApi {
  return parts as unknown as PaseoApi;
}

describe("createPaseoPort", () => {
  it("lists projects with their root paths", async () => {
    const port = createPaseoPort(
      stubPaseo({
        projects: {
          list: async () => ({
            requestId: "r",
            projects: [{ projectId: "p1", projectRootPath: "/root", projectDisplayName: "root", projectKind: "non_git" }],
          }),
        },
      }),
    );
    await expect(port.listProjects()).resolves.toEqual([{ projectId: "p1", projectRootPath: "/root" }]);
  });

  it("throws when archive reports an error", async () => {
    const port = createPaseoPort(
      stubPaseo({
        workspaces: {
          archive: async () => ({ requestId: "r", workspaceId: "w1", archivedAt: null, error: "busy" }),
        },
      }),
    );
    await expect(port.archiveWorkspace("w1")).rejects.toBeInstanceOf(PaseoOperationError);
  });

  it("creates a directory workspace and passes the title only when given", async () => {
    const create = vi.fn(async () => ({ id: "w1" }));
    const port = createPaseoPort(stubPaseo({ workspaces: { create } }));

    await port.createDirectoryWorkspace({ directory: "/root/t", projectId: "p1" });
    await port.createDirectoryWorkspace({ directory: "/root/u", projectId: "p1", title: "Name" });

    expect(create.mock.calls).toEqual([
      [{ source: { kind: "directory", path: "/root/t", projectId: "p1" } }],
      [{ source: { kind: "directory", path: "/root/u", projectId: "p1" }, title: "Name" }],
    ]);
  });

  it("reads an untitled workspace as title null", async () => {
    const refresh = async () => ({ id: "w1", projectRootPath: "/root", name: "2026-10-11-1432" });
    const port = createPaseoPort(stubPaseo({ workspaces: { ref: () => ({ refresh }) } }));
    await expect(port.getWorkspace("w1")).resolves.toEqual({ id: "w1", projectRootPath: "/root", title: null });
  });

  it("throws when the workspace is gone", async () => {
    const port = createPaseoPort(stubPaseo({ workspaces: { ref: () => ({ refresh: async () => null }) } }));
    await expect(port.getWorkspace("w1")).rejects.toBeInstanceOf(PaseoOperationError);
  });

  it("reads the agent title from a fresh snapshot", async () => {
    const refresh = async () => ({ agent: { id: "a1", title: "Write a CSV parser" }, project: null });
    const port = createPaseoPort(stubPaseo({ agents: { ref: () => ({ refresh }) } }));
    await expect(port.getAgentTitle("a1")).resolves.toBe("Write a CSV parser");
  });

  it("throws when the agent is gone", async () => {
    const port = createPaseoPort(stubPaseo({ agents: { ref: () => ({ refresh: async () => null }) } }));
    await expect(port.getAgentTitle("a1")).rejects.toBeInstanceOf(PaseoOperationError);
  });
});

describe("createPaseoPort.listActiveWorkspaces", () => {
  it("reads every page, including background workspaces", async () => {
    const list = vi.fn(async (options: { page?: { cursor?: string } }) =>
      options.page?.cursor === undefined
        ? {
            requestId: "r1",
            entries: [{ id: "w1", workspaceDirectory: "/a" }],
            pageInfo: { nextCursor: "c2", prevCursor: null, hasMore: true },
          }
        : {
            requestId: "r2",
            entries: [{ id: "w2", workspaceDirectory: "/b" }],
            pageInfo: { nextCursor: null, prevCursor: "c1", hasMore: false },
          },
    );
    const port = createPaseoPort(stubPaseo({ workspaces: { list } }));

    await expect(port.listActiveWorkspaces()).resolves.toEqual([
      { id: "w1", directory: "/a" },
      { id: "w2", directory: "/b" },
    ]);
    expect(list.mock.calls.map(([options]) => options)).toEqual([
      { filter: { includeBackground: true }, page: { limit: 200 } },
      { filter: { includeBackground: true }, page: { limit: 200, cursor: "c2" } },
    ]);
  });

  it("throws when an entry has no directory", async () => {
    const list = async () => ({
      requestId: "r1",
      entries: [{ id: "w1" }],
      pageInfo: { nextCursor: null, prevCursor: null, hasMore: false },
    });
    const port = createPaseoPort(stubPaseo({ workspaces: { list } }));

    await expect(port.listActiveWorkspaces()).rejects.toBeInstanceOf(PaseoOperationError);
  });
});
