// @vitest-environment jsdom
import { StrictMode, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { usePopupExit } from "../src/lib/popup-exit";
function Popup() {
  const ref = useRef<HTMLDivElement>(null);
  usePopupExit(ref, "dialog");
  return (
    <div
      ref={ref}
      className="dialog-shade"
      role="dialog"
      aria-modal="true"
      data-one-dialog="owner"
    >
      <div className="dialog">
        <input
          id="draft"
          aria-label="Draft"
          defaultValue="Keep the edited value"
          data-one-dialog-owner="owner"
        />
      </div>
    </div>
  );
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(10, 20, 300, 200),
  );
});
afterEach(async () => {
  cleanup();
  await act(async () => {});
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("popup exit visuals", () => {
  it("keeps only an inert aria-hidden visual with no duplicate identity and removes it promptly", async () => {
    const view = render(
      <MotionConfig reducedMotion="never">
        <Popup />
      </MotionConfig>,
    );
    document.querySelector<HTMLElement>(".dialog")!.scrollTop = 37;
    view.unmount();
    await act(async () => {});
    const copy = document.querySelector<HTMLElement>(".one-popup-exit")!;
    expect(copy).toBeTruthy();
    expect(copy.inert).toBe(true);
    expect(copy.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("dialog")).toBe(null);
    expect(
      copy.querySelector(
        "[id],[role],[aria-modal],[data-one-dialog-owner],[data-one-dialog]",
      ),
    ).toBe(null);
    expect(copy.querySelector("input")?.value).toBe("Keep the edited value");
    expect(copy.querySelector<HTMLElement>(".dialog")!.scrollTop).toBe(37);
    act(() => vi.advanceTimersByTime(250));
    expect(document.querySelector(".one-popup-exit")).toBe(null);
  });
  it("skips StrictMode simulated unmounts, immediate replacements and reduced motion", async () => {
    let view = render(
      <StrictMode>
        <MotionConfig reducedMotion="never">
          <Popup />
        </MotionConfig>
      </StrictMode>,
    );
    await act(async () => {});
    expect(document.querySelector(".one-popup-exit")).toBe(null);
    view.unmount();
    view = render(
      <MotionConfig reducedMotion="never">
        <Popup />
      </MotionConfig>,
    );
    await act(async () => {});
    expect(document.querySelector(".one-popup-exit")).toBe(null);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    view.unmount();
    await act(async () => {});
    act(() => vi.advanceTimersByTime(250));
    view = render(
      <MotionConfig reducedMotion="always">
        <Popup />
      </MotionConfig>,
    );
    view.unmount();
    await act(async () => {});
    expect(document.querySelector(".one-popup-exit")).toBe(null);
  });
});
