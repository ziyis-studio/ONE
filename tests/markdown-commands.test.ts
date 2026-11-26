import { describe, expect, it } from "vitest";
import {
  insertMarkdown,
  markdownCommands,
  matchingCommands,
  slashRange,
} from "../src/lib/markdown-commands";
describe("Markdown commands", () => {
  it("opens at paragraph starts while preserving indentation, without treating paths or URLs as commands", () => {
    expect(slashRange("First paragraph\n  /heading", 26)).toEqual({
      start: 18,
      end: 26,
      query: "heading",
    });
    for (const value of [
      "https://example.com/",
      "A /heading",
      "docs/notes",
      "//",
      "/two words",
    ])
      expect(slashRange(value, value.length)).toBe(null);
    expect(slashRange("/h", 0, 2)).toBe(null);
    expect(matchingCommands("标题").map((command) => command.id)).toEqual([
      "h1",
      "h2",
      "h3",
    ]);
  });
  it("replaces only the slash query and puts the cursor inside a code block", () => {
    const source = "Before\n/code\nAfter",
      range = slashRange(source, 12)!;
    const command = markdownCommands.find((item) => item.id === "code")!;
    const result = insertMarkdown(
      source,
      range,
      command.insert,
      command.cursor,
    );
    expect(result.value).toBe("Before\n```\n\n```\nAfter");
    expect(result.value.slice(result.cursor - 1, result.cursor + 1)).toBe(
      "\n\n",
    );
  });
});
