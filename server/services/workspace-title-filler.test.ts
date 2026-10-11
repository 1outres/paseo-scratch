import { describe, expect, it } from "vitest";
import { FakePaseo } from "../testing/fakes";
import { WorkspaceTitleFiller } from "./workspace-title-filler";

const root = "/home/ada/.paseo/scratchpad";

function setup() {
  const paseo = new FakePaseo();
  const filler = new WorkspaceTitleFiller({ root });
  return { paseo, filler };
}

describe("WorkspaceTitleFiller.handleAgentCreated", () => {
  it("sets the agent title on an untitled scratchpad workspace", async () => {
    const { paseo, filler } = setup();
    const workspace = paseo.addWorkspace({ projectRootPath: root, title: null });
    const agent = paseo.addAgent("Write a CSV parser");

    await filler.handleAgentCreated({ id: agent.id, workspaceId: workspace.id, parentAgentId: null }, paseo);

    expect(paseo.workspaces.get(workspace.id)?.title).toBe("Write a CSV parser");
  });

  it("does not change a workspace that already has a title", async () => {
    const { paseo, filler } = setup();
    const workspace = paseo.addWorkspace({ projectRootPath: root, title: "CSV パーサ検証" });
    const agent = paseo.addAgent("Write a CSV parser");

    await filler.handleAgentCreated({ id: agent.id, workspaceId: workspace.id, parentAgentId: null }, paseo);

    expect(paseo.callsTo("setWorkspaceTitle")).toEqual([]);
  });

  it("does not change a workspace of another project", async () => {
    const { paseo, filler } = setup();
    const workspace = paseo.addWorkspace({ projectRootPath: "/code/app", title: null });
    const agent = paseo.addAgent("Fix the bug");

    await filler.handleAgentCreated({ id: agent.id, workspaceId: workspace.id, parentAgentId: null }, paseo);

    expect(paseo.callsTo("setWorkspaceTitle")).toEqual([]);
  });

  it("ignores sub-agents without calling Paseo", async () => {
    const { paseo, filler } = setup();
    const workspace = paseo.addWorkspace({ projectRootPath: root, title: null });
    const agent = paseo.addAgent("Sub task");

    await filler.handleAgentCreated({ id: agent.id, workspaceId: workspace.id, parentAgentId: "agt_parent" }, paseo);

    expect(paseo.calls).toEqual([]);
  });

  it("ignores agents without a workspace", async () => {
    const { paseo, filler } = setup();
    const agent = paseo.addAgent("Loose agent");

    await filler.handleAgentCreated({ id: agent.id, workspaceId: null, parentAgentId: null }, paseo);

    expect(paseo.calls).toEqual([]);
  });

  it("does nothing when the agent has no title", async () => {
    const { paseo, filler } = setup();
    const workspace = paseo.addWorkspace({ projectRootPath: root, title: null });
    const agent = paseo.addAgent(null);

    await filler.handleAgentCreated({ id: agent.id, workspaceId: workspace.id, parentAgentId: null }, paseo);

    expect(paseo.callsTo("setWorkspaceTitle")).toEqual([]);
  });

  it("returns Paseo errors to the caller", async () => {
    const { paseo, filler } = setup();
    const agent = paseo.addAgent("Write a CSV parser");

    await expect(
      filler.handleAgentCreated({ id: agent.id, workspaceId: "wks_missing", parentAgentId: null }, paseo),
    ).rejects.toThrow("unknown workspace");
  });
});
