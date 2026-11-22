import { expect, test } from "vitest";
import { readTagDraft } from "../src/lib/tag-draft";
test("new tag drafts preserve commas while legacy drafts remain readable", () => {
  expect(readTagDraft("design, personal")).toEqual(["design", "personal"]);
  expect(readTagDraft(JSON.stringify(["research, notes", "中文"]))).toEqual([
    "research, notes",
    "中文",
  ]);
  expect(readTagDraft("")).toEqual([]);
});
