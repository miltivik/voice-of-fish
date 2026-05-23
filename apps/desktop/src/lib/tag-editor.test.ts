import { describe, expect, it } from "vitest";
import { insertTagAtSelection } from "./tag-editor";

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
