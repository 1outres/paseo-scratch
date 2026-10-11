import { describe, expect, it } from "vitest";
import { createScratchTask } from "./scratch-task-rpc";

describe("createScratchTask contract", () => {
  it("accepts an input without a name", () => {
    expect(createScratchTask.input.parse({})).toEqual({});
  });

  it("trims the name", () => {
    expect(createScratchTask.input.parse({ name: "  CSV  " })).toEqual({ name: "CSV" });
  });

  it("rejects an empty name, so a blank field must be sent as no name", () => {
    expect(() => createScratchTask.input.parse({ name: "  " })).toThrow();
  });

  it("requires a workspace id and a directory in the output", () => {
    expect(() => createScratchTask.output.parse({ workspaceId: "w1" })).toThrow();
    expect(createScratchTask.output.parse({ workspaceId: "w1", directory: "/d" })).toEqual({
      workspaceId: "w1",
      directory: "/d",
    });
  });
});
