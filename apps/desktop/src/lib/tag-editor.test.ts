import { describe, expect, it } from "vitest";
import { insertTagAtSelection, getActiveQuery, filterTags } from "./tag-editor";

describe("insertTagAtSelection", () => {
  it("inserts a tag at cursor and returns next cursor", () => {
    expect(insertTagAtSelection("Hello world", "[calm]", 6, 6)).toEqual({
      text: "Hello [calm]world",
      selectionStart: 12,
      selectionEnd: 12,
    });
  });

  it("replaces selected text with a tag", () => {
    expect(
      insertTagAtSelection("Hello loud world", "[whisper]", 6, 10).text,
    ).toBe("Hello [whisper] world");
  });
});
describe("getActiveQuery", () => {
  it("returns null when no [ before cursor", () => {
    expect(getActiveQuery("Hello world", 5)).toBeNull();
  });

  it("returns query text when [ is open", () => {
    expect(getActiveQuery("Hello [cal", 11)).toBe("cal");
  });

  it("returns null when bracket is closed", () => {
    expect(getActiveQuery("Hello [calm] world", 12)).toBeNull();
  });

  it("returns empty string right after [", () => {
    expect(getActiveQuery("Hello [", 7)).toBe("");
  });

  it("ignores earlier closed brackets", () => {
    expect(getActiveQuery("[calm] hello [la", 16)).toBe("la");
  });

  it("returns null when cursor is before [", () => {
    expect(getActiveQuery("Hello [calm]", 4)).toBeNull();
  });
});

describe("filterTags", () => {
  it("returns all tags for empty query", () => {
    const tags = filterTags("");
    expect(tags.length).toBeGreaterThan(0);
  });

  it("filters tags case-insensitively", () => {
    const tags = filterTags("cal");
    expect(tags.some((t) => t.includes("[calm]"))).toBe(true);
  });

  it("returns empty for non-matching query", () => {
    const tags = filterTags("zzzzz");
    expect(tags).toHaveLength(0);
  });

  it("matches partial tag names", () => {
    const tags = filterTags("whis");
    expect(tags.some((t) => t.includes("[whisper]"))).toBe(true);
  });
});
