import { describe, expect, it } from "vitest";
import { resolvePaseoHome, resolveScratchRoot } from "./paseo-home";

const base = { homeDirectory: "/home/ada", cwd: "/work" };

describe("resolvePaseoHome", () => {
  it("uses ~/.paseo when PASEO_HOME is not set", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: undefined })).toBe("/home/ada/.paseo");
  });

  it("uses PASEO_HOME when it is an absolute path", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "/srv/paseo" })).toBe("/srv/paseo");
  });

  it("expands a leading ~/", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "~/custom" })).toBe("/home/ada/custom");
  });

  it("expands a bare ~", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "~" })).toBe("/home/ada");
  });

  it("does not expand ~ in the middle of a path", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "/a/~/b" })).toBe("/a/~/b");
  });

  it("does not expand ~user", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "~bob/x" })).toBe("/work/~bob/x");
  });

  it("resolves a relative path against the cwd", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "state/paseo" })).toBe("/work/state/paseo");
  });

  it("normalizes the path", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "/srv//paseo/../p/" })).toBe("/srv/p");
  });

  it("treats an empty PASEO_HOME as set, like Paseo does", () => {
    expect(resolvePaseoHome({ ...base, paseoHomeEnv: "" })).toBe("/work");
  });
});

describe("resolveScratchRoot", () => {
  it("puts the root in the scratchpad directory of the Paseo home", () => {
    expect(resolveScratchRoot({ ...base, paseoHomeEnv: undefined })).toBe(
      "/home/ada/.paseo/scratchpad",
    );
  });
});
