import { describe, expect, it } from "vitest";
import {
  OPEN_WORKSPACE_FRESH_MS,
  OpenWorkspaceVisits,
  createOpenWorkspaceParams,
  parseOpenWorkspaceParams,
} from "./open-workspace-visit";

describe("createOpenWorkspaceParams", () => {
  it("puts the workspace id and a visit token made from the time into string params", () => {
    expect(createOpenWorkspaceParams("wks_1", { now: 1_000, random: "abc" })).toEqual({
      workspaceId: "wks_1",
      visit: "1000.abc",
    });
  });
});

describe("parseOpenWorkspaceParams", () => {
  it("reads the params back", () => {
    expect(parseOpenWorkspaceParams({ workspaceId: "wks_1", visit: "1000.abc" })).toEqual({
      ok: true,
      workspaceId: "wks_1",
      visit: { token: "1000.abc", createdAt: 1_000 },
    });
  });

  it("rejects a missing workspace id", () => {
    expect(parseOpenWorkspaceParams({ visit: "1000.abc" })).toMatchObject({ ok: false });
  });

  it("rejects a missing or broken visit token", () => {
    expect(parseOpenWorkspaceParams({ workspaceId: "wks_1" })).toMatchObject({ ok: false });
    expect(parseOpenWorkspaceParams({ workspaceId: "wks_1", visit: "abc" })).toMatchObject({ ok: false });
    expect(parseOpenWorkspaceParams({ workspaceId: "wks_1", visit: "12x.abc" })).toMatchObject({ ok: false });
  });
});

describe("OpenWorkspaceVisits.claim", () => {
  const visit = { token: "1000.abc", createdAt: 1_000 };

  it("allows the first claim of a fresh visit", () => {
    expect(new OpenWorkspaceVisits().claim(visit, 1_500)).toBe(true);
  });

  it("allows a visit only once, so Back does not navigate again", () => {
    const visits = new OpenWorkspaceVisits();
    visits.claim(visit, 1_500);
    expect(visits.claim(visit, 1_600)).toBe(false);
  });

  it("keeps visits apart", () => {
    const visits = new OpenWorkspaceVisits();
    visits.claim(visit, 1_500);
    expect(visits.claim({ token: "1001.def", createdAt: 1_001 }, 1_600)).toBe(true);
  });

  it("refuses an old visit, for example after the app was reloaded and the claims were lost", () => {
    const old = OPEN_WORKSPACE_FRESH_MS + 1;
    expect(new OpenWorkspaceVisits().claim(visit, visit.createdAt + old)).toBe(false);
  });

  it("refuses a visit from the future, as a broken clock or a hand-made link would make", () => {
    expect(new OpenWorkspaceVisits().claim(visit, visit.createdAt - 1)).toBe(false);
  });
});
