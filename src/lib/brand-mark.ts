// Exact paths from ONE-Tri-Segment-master.svg: O / N / E, three 24° gaps.
export const ONE_SEGMENTS = [
  {
    name: "long",
    letter: "O",
    d: "M 36.32441 82.21767 A 35 35 0 0 1 63.67559 17.78233",
    reverseD: "M 63.67559 17.78233 A 35 35 0 0 0 36.32441 82.21767",
    degrees: 180,
    start: 0,
  },
  {
    name: "medium",
    letter: "N",
    d: "M 83.47067 60.23301 A 35 35 0 0 1 50.61083 84.99467",
    reverseD: "M 50.61083 84.99467 A 35 35 0 0 0 83.47067 60.23301",
    degrees: 72,
    start: 180,
  },
  {
    name: "short",
    letter: "E",
    d: "M 75.59738 26.13006 A 35 35 0 0 1 84.73912 45.73457",
    reverseD: "M 84.73912 45.73457 A 35 35 0 0 0 75.59738 26.13006",
    degrees: 36,
    start: 252,
  },
] as const;

export function segmentProgress(
  ratio: number,
  segment: (typeof ONE_SEGMENTS)[number],
) {
  return Math.max(
    0,
    Math.min(1, (ratio * 288 - segment.start) / segment.degrees),
  );
}
