import { describe, expect, it } from "vitest";
import { decideWorkspaceTitle, isTitleSourceAgent } from "./title-fill";

const root = "/home/ada/.paseo/scratchpad";

describe("isTitleSourceAgent", () => {
  it("is true for a top-level agent in a workspace", () => {
    expect(isTitleSourceAgent({ workspaceId: "w1", parentAgentId: null })).toBe(true);
  });

  it("is false for an agent with a parent agent", () => {
    expect(isTitleSourceAgent({ workspaceId: "w1", parentAgentId: "a0" })).toBe(false);
  });

  it("is false for an agent without a workspace", () => {
    expect(isTitleSourceAgent({ workspaceId: null, parentAgentId: null })).toBe(false);
  });
});

describe("decideWorkspaceTitle", () => {
  const scratchWorkspace = { projectRootPath: root, title: null };

  it("uses the agent title for an untitled scratchpad workspace", () => {
    expect(
      decideWorkspaceTitle({ scratchRoot: root, workspace: scratchWorkspace, agentTitle: "Write a CSV parser" }),
    ).toBe("Write a CSV parser");
  });

  it("does nothing for a workspace of another project", () => {
    expect(
      decideWorkspaceTitle({
        scratchRoot: root,
        workspace: { projectRootPath: "/code/app", title: null },
        agentTitle: "Fix the bug",
      }),
    ).toBeNull();
  });

  it("does nothing when the workspace already has a title", () => {
    expect(
      decideWorkspaceTitle({
        scratchRoot: root,
        workspace: { projectRootPath: root, title: "CSV パーサ検証" },
        agentTitle: "Write a CSV parser",
      }),
    ).toBeNull();
  });

  it("treats an empty workspace title as no title", () => {
    expect(
      decideWorkspaceTitle({
        scratchRoot: root,
        workspace: { projectRootPath: root, title: "" },
        agentTitle: "Write a CSV parser",
      }),
    ).toBe("Write a CSV parser");
  });

  it("does nothing when the agent has no title", () => {
    expect(decideWorkspaceTitle({ scratchRoot: root, workspace: scratchWorkspace, agentTitle: null })).toBeNull();
  });

  it("does nothing when the agent title is blank", () => {
    expect(decideWorkspaceTitle({ scratchRoot: root, workspace: scratchWorkspace, agentTitle: "  " })).toBeNull();
  });
});
