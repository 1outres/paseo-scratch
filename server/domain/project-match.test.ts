import { describe, expect, it } from "vitest";
import { findProjectByRoot } from "./project-match";

const root = "/home/ada/.paseo/scratchpad";

describe("findProjectByRoot", () => {
  it("finds the project whose projectRootPath is the root", () => {
    const projects = [
      { projectId: "p1", projectRootPath: "/code/app" },
      { projectId: "p2", projectRootPath: root },
    ];
    expect(findProjectByRoot(projects, root)).toEqual(projects[1]);
  });

  it("returns null when no project matches", () => {
    expect(findProjectByRoot([{ projectId: "p1", projectRootPath: "/code/app" }], root)).toBeNull();
  });

  it("does not match a subdirectory or a parent of the root", () => {
    const projects = [
      { projectId: "p1", projectRootPath: `${root}/2026-10-11-1432` },
      { projectId: "p2", projectRootPath: "/home/ada/.paseo" },
    ];
    expect(findProjectByRoot(projects, root)).toBeNull();
  });

  it("matches a projectRootPath that differs only by a trailing slash", () => {
    const projects = [{ projectId: "p1", projectRootPath: `${root}/` }];
    expect(findProjectByRoot(projects, root)).toEqual(projects[0]);
  });
});
