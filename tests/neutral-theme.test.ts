import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("ONE neutral foundation and configurable accent", () => {
  it("keeps typography and base surfaces neutral outside the central accent file", () => {
    for (const file of [
      "src/styles.css",
      "src/workspace.css",
      "src/workspace-polish.css",
      "src/components/select-field.css",
      "src/components/chart-tooltip.css",
      "src/components/schedule-planning.css",
      "src/components/auth.css",
      "src/components/interactions.css",
      "src/components/logo-motion.css",
      "src/components/navigation.css",
      "src/components/cards.css",
      "src/components/workspace-loading.css",
      "src/components/date-time-field.css",
      "src/components/appearance-settings.css",
      "src/components/confirmation.css",
      "src/components/sleep-history.css",
    ]) {
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
  it("keeps default violet tokens and neutral surfaces in the accent sheet", () => {
    const css = readFileSync("src/brand.css", "utf8");
    const approved = new Set(["7852ee", "7048e5", "a882ff", "fff", "eee"]);
    for (const [, hex] of css.matchAll(/#([a-f0-9]{6}|[a-f0-9]{3})\b/gi)) {
      const expanded =
        hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
      expect(
        approved.has(hex.toLowerCase()) ||
          /^(?:([a-f0-9]{2})\1\1)$/.test(expanded),
      ).toBe(true);
    }
    const luminance = (hex: string) =>
      [0, 2, 4]
        .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        )
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    for (const hex of ["7852ee", "7048e5"])
      expect(1.05 / (luminance(hex) + 0.05)).toBeGreaterThanOrEqual(4.5);
    expect(css).not.toMatch(/gradient\(/);
  });
});
