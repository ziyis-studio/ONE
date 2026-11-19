// @vitest-environment jsdom
import { StrictMode } from "react";
import { MotionConfig } from "motion/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChartEntrance } from "../src/lib/chart-entrance";

let frames: Map<number, FrameRequestCallback>;
let frameId: number;
let visible: boolean;
let observations: {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
}[];
let animations: {
  target: Element;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  events: EventTarget;
}[];
const originalAnimate = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "animate",
);
function flushFrame() {
  act(() => {
    const next = [...frames.values()];
    frames.clear();
    next.forEach((callback) => callback(0));
  });
}
function reveal(index = observations.length - 1) {
  act(() =>
    observations[index].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  flushFrame();
}
function chart({ ready = true, replayKey = "week", value = 45 } = {}) {
  return (
    <ChartEntrance ready={ready} replayKey={replayKey} data-testid="chart">
      <svg>
        <path
          data-chart-enter="draw"
          pathLength="100"
          strokeDasharray={`${value} 100`}
        />
      </svg>
      <button>Inspect</button>
    </ChartEntrance>
  );
}
beforeEach(() => {
  frames = new Map();
  frameId = 0;
  visible = true;
  observations = [];
  animations = [];
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({
      top: visible ? 10 : 2000,
      bottom: visible ? 110 : 2100,
      left: 10,
      right: 110,
      width: 100,
      height: 100,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    }),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        observations.push({ callback, disconnect: this.disconnect });
      }
    },
  );
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: vi.fn(function (
      this: Element,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions,
    ) {
      const events = new EventTarget(),
        cancel = vi.fn();
      animations.push({
        target: this,
        frames: keyframes,
        options,
        cancel,
        events,
      });
      return { cancel, addEventListener: events.addEventListener.bind(events) };
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.className = "";
  if (originalAnimate)
    Object.defineProperty(Element.prototype, "animate", originalAnimate);
  else delete (Element.prototype as unknown as { animate?: unknown }).animate;
});
it("waits for async data and survives StrictMode's setup probe without consuming the entrance", () => {
  const view = render(<StrictMode>{chart({ ready: false })}</StrictMode>);
  flushFrame();
  expect(animations).toHaveLength(0);
  view.rerender(<StrictMode>{chart()}</StrictMode>);
  flushFrame();
  expect(animations).toHaveLength(2);
  expect(animations[1].frames[0].strokeDasharray).toBe("0 100");
  expect(view.getByTestId("chart").dataset.chartMotion).toBe("playing");
  animations.forEach((a) => a.events.dispatchEvent(new Event("finish")));
  expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(true);
  expect(view.getByTestId("chart").dataset.chartMotion).toBe("ready");
  view.rerender(<StrictMode>{chart({ value: 70 })}</StrictMode>);
  flushFrame();
  expect(animations).toHaveLength(2);
  expect(
    view.container.querySelector("path")!.getAttribute("stroke-dasharray"),
  ).toBe("70 100");
  view.rerender(<StrictMode>{chart({ replayKey: "month" })}</StrictMode>);
  flushFrame();
  expect(animations).toHaveLength(4);
  view.unmount();
  expect(animations.every((a) => a.cancel.mock.calls.length >= 1)).toBe(true);
});
it("defers offscreen charts and disconnects observation on interaction or unmount", () => {
  visible = false;
  const view = render(chart());
  flushFrame();
  expect(animations).toHaveLength(0);
  reveal();
  expect(animations).toHaveLength(2);
  fireEvent.focusIn(view.getByRole("button"));
  expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(true);
  view.rerender(chart({ replayKey: "year" }));
  expect(view.getByTestId("chart").dataset.chartMotion).toBe("pending");
  const observer = observations.at(-1)!;
  fireEvent.pointerDown(view.getByRole("button"));
  expect(observer.disconnect).toHaveBeenCalled();
  view.unmount();
  reveal();
  expect(animations).toHaveLength(2);
});
it("settles on a live reduced-motion change and skips initial reduced motion", () => {
  const view = render(
    <MotionConfig reducedMotion="never">{chart()}</MotionConfig>,
  );
  flushFrame();
  expect(animations).toHaveLength(2);
  view.rerender(<MotionConfig reducedMotion="always">{chart()}</MotionConfig>);
  expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(true);
  expect(view.getByTestId("chart").dataset.chartMotion).toBe("static");
  view.rerender(
    <MotionConfig reducedMotion="always">
      {chart({ replayKey: "month" })}
    </MotionConfig>,
  );
  flushFrame();
  expect(animations).toHaveLength(2);
  view.rerender(
    <MotionConfig reducedMotion="never">
      {chart({ replayKey: "month" })}
    </MotionConfig>,
  );
  flushFrame();
  expect(animations).toHaveLength(2);
});
it("bounds dense heatmap work and gives nested charts their own animation scope", () => {
  const view = render(
    <ChartEntrance>
      <ChartEntrance data-testid="dense">
        {Array.from({ length: 366 }, (_, i) => (
          <i key={i} data-chart-enter="cell" />
        ))}
      </ChartEntrance>
    </ChartEntrance>,
  );
  flushFrame();
  expect(animations).toHaveLength(2);
  expect(animations.every((a) => a.target.tagName === "DIV")).toBe(true);
  view.unmount();
  document.body.className = "one-card-drag-active";
  render(chart());
  flushFrame();
  expect(animations).toHaveLength(2);
});
it("does not replay the same range after an ordinary data refresh", () => {
  const view = render(chart());
  flushFrame();
  view.rerender(chart({ ready: false }));
  view.rerender(chart({ ready: true, value: 80 }));
  flushFrame();
  expect(animations).toHaveLength(2);
});
it("plays once on a ready StrictMode mount and cancels a queued frame on unmount", () => {
  const first = render(<StrictMode>{chart()}</StrictMode>);
  flushFrame();
  expect(animations).toHaveLength(2);
  first.unmount();
  const second = render(chart());
  second.unmount();
  flushFrame();
  expect(animations).toHaveLength(2);
});
it("shows final data with no animation when the browser lacks Web Animations", () => {
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
  const view = render(chart());
  flushFrame();
  expect(view.getByTestId("chart").dataset.chartMotion).toBe("static");
  expect(
    view.container.querySelector("path")!.getAttribute("stroke-dasharray"),
  ).toBe("45 100");
});
