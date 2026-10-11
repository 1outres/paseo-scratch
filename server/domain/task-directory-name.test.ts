import { describe, expect, it } from "vitest";
import { taskDirectoryBaseName } from "./task-directory-name";

describe("taskDirectoryBaseName", () => {
  it("uses the date and the slug when the task has a name", () => {
    const now = new Date(2026, 9, 11, 14, 32, 5);
    expect(taskDirectoryBaseName({ now, slug: "csv-パーサ検証" })).toBe("2026-10-11-csv-パーサ検証");
  });

  it("uses the date and the time when the task has no name", () => {
    const now = new Date(2026, 9, 11, 14, 32, 59);
    expect(taskDirectoryBaseName({ now })).toBe("2026-10-11-1432");
  });

  it("pads month, day, hour and minute with zeros", () => {
    const now = new Date(2026, 0, 2, 3, 4);
    expect(taskDirectoryBaseName({ now })).toBe("2026-01-02-0304");
  });

  it("uses local time, not UTC", () => {
    const now = new Date(2026, 11, 31, 23, 59);
    expect(taskDirectoryBaseName({ now })).toBe("2026-12-31-2359");
  });
});
