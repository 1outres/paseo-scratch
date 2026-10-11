import { describe, expect, it } from "vitest";
import { ensureScratchProject } from "./scratch-project-rpc";

describe("ensureScratchProject contract", () => {
  it("uses a wire name that Paseo accepts", () => {
    expect(ensureScratchProject.name).toBe("scratch.ensure-project");
  });

  it("takes an empty input", () => {
    expect(ensureScratchProject.input.parse({})).toEqual({});
  });

  it("rejects unknown input fields", () => {
    expect(() => ensureScratchProject.input.parse({ root: "/tmp" })).toThrow();
  });

  it("returns the project id", () => {
    expect(ensureScratchProject.output.parse({ projectId: "prj_1" })).toEqual({ projectId: "prj_1" });
    expect(() => ensureScratchProject.output.parse({ projectId: "" })).toThrow();
  });
});
