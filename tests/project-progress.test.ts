import { expect, it } from "vitest";
import {
  PROJECT_PROGRESS_SEGMENTS,
  segmentProgress,
} from "../src/lib/brand-mark";

it("fills project progress clockwise from the shortest arc through the medium and longest arcs", () => {
  expect(PROJECT_PROGRESS_SEGMENTS.map((s) => s.name)).toEqual([
    "short",
    "medium",
    "long",
  ]);
  const fills = (ratio: number) =>
    PROJECT_PROGRESS_SEGMENTS.map((s) => segmentProgress(ratio, s));
  expect(fills(0)).toEqual([0, 0, 0]);
  expect(fills(0.125)).toEqual([1, 0, 0]);
  expect(fills(0.375)).toEqual([1, 1, 0]);
  expect(fills(1)).toEqual([1, 1, 1]);
  expect(fills(0.7)[2]).toBeCloseTo(0.52);
});
