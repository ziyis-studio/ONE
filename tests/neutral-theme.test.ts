import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("neutral ONE palette", () => {
  it("uses only achromatic colors throughout the interface", () => {
    for (const file of ["src/styles.css", "src/workspace.css"]) {
      const source = readFileSync(file, "utf8");
      const colors = [
        ...source.matchAll(
          /#([a-f0-9]{8}|[a-f0-9]{6}|[a-f0-9]{4}|[a-f0-9]{3})\b/gi,
        ),
      ];
      for (const [, raw] of colors) {
        const hex =
          raw.length < 5
            ? [...raw].map((character) => character.repeat(2)).join("")
            : raw;
        expect(hex.slice(0, 2), file + ": #" + raw).toBe(hex.slice(2, 4));
        expect(hex.slice(2, 4), file + ": #" + raw).toBe(hex.slice(4, 6));
      }
      expect(source).not.toMatch(
        /(?:background|background-image):\s*(?:linear|radial|conic)-gradient/,
      );
    }
  });
});
