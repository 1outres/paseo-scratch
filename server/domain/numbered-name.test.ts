import { describe, expect, it } from "vitest";
import { numberedName } from "./numbered-name";

describe("numberedName", () => {
  it("uses the base name for the first attempt", () => {
    expect(numberedName("2026-10-11-1432", 1)).toBe("2026-10-11-1432");
  });

  it("adds -2, -3 and so on for later attempts", () => {
    expect(numberedName("2026-10-11-1432", 2)).toBe("2026-10-11-1432-2");
    expect(numberedName("2026-10-11-csv", 3)).toBe("2026-10-11-csv-3");
  });

  it("rejects an attempt number below 1 or not an integer", () => {
    expect(() => numberedName("x", 0)).toThrow(RangeError);
    expect(() => numberedName("x", 1.5)).toThrow(RangeError);
  });
});
