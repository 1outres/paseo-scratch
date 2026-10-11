import { describe, expect, it } from "vitest";
import { EMPTY_SLUG_MESSAGE, parseTaskNameField, parseTaskSlug, slugify } from "./task-name";

describe("slugify", () => {
  it("keeps Japanese and joins words with a hyphen", () => {
    expect(slugify("CSV パーサ検証")).toBe("csv-パーサ検証");
  });

  it("applies NFKC so full-width letters and digits become half-width", () => {
    expect(slugify("ＡＢＣ１２３")).toBe("abc123");
  });

  it("applies NFKC so half-width katakana becomes full-width", () => {
    expect(slugify("ﾃｽﾄ")).toBe("テスト");
  });

  it("lowercases only ASCII letters", () => {
    expect(slugify("Hello ÄÖ")).toBe("hello-ÄÖ");
  });

  it("replaces whitespace, symbols and path separators with a hyphen", () => {
    expect(slugify("a/b\\c d+e@f")).toBe("a-b-c-d-e-f");
  });

  it("replaces characters that are not allowed in file names", () => {
    expect(slugify('a<b>c:d"e|f?g*h')).toBe("a-b-c-d-e-f-g-h");
  });

  it("replaces control characters", () => {
    expect(slugify("a\u0000b\u001fc\u007fd")).toBe("a-b-c-d");
  });

  it("joins runs of hyphens into one", () => {
    expect(slugify("a -- / -- b")).toBe("a-b");
  });

  it("keeps dots and underscores inside the slug", () => {
    expect(slugify("v1.2_final")).toBe("v1.2_final");
  });

  it("removes hyphens and dots at the start and the end", () => {
    expect(slugify(" ..-.hello.-. ")).toBe("hello");
  });

  it("cuts the result to 50 characters", () => {
    expect(slugify("a".repeat(60))).toBe("a".repeat(50));
  });

  it("counts characters, not UTF-16 code units", () => {
    expect(slugify("𠮷".repeat(60))).toBe("𠮷".repeat(50));
  });

  it("does not end with a hyphen after cutting", () => {
    expect(slugify(`${"a".repeat(49)} b`)).toBe("a".repeat(49));
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify(" !?/ ")).toBe("");
    expect(slugify("..")).toBe("");
  });
});

describe("parseTaskSlug", () => {
  it("returns the slug for a usable name", () => {
    expect(parseTaskSlug("CSV パーサ検証")).toEqual({ ok: true, slug: "csv-パーサ検証" });
  });

  it("returns an input error when the slug is empty", () => {
    expect(parseTaskSlug("???")).toEqual({ ok: false, message: EMPTY_SLUG_MESSAGE });
  });
});

describe("parseTaskNameField", () => {
  it("treats an empty field as a task without a name", () => {
    expect(parseTaskNameField("")).toEqual({ ok: true, input: {} });
  });

  it("treats a field with only spaces as a task without a name", () => {
    expect(parseTaskNameField("   ")).toEqual({ ok: true, input: {} });
  });

  it("trims the name", () => {
    expect(parseTaskNameField("  CSV パーサ検証 ")).toEqual({
      ok: true,
      input: { name: "CSV パーサ検証" },
    });
  });

  it("returns an input error when the name has no usable slug", () => {
    expect(parseTaskNameField("!!!")).toEqual({ ok: false, message: EMPTY_SLUG_MESSAGE });
  });
});
