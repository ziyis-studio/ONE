// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { AuthLogo } from "../src/components/AuthLogo";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function animationEnvironment() {
  let reduced = false,
    next = 0;
  const listeners = new Set<() => void>();
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++next, callback);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  return {
    frames,
    tick(time: number) {
      act(() => {
        const current = [...frames.values()];
        frames.clear();
        current.forEach((callback) => callback(time));
      });
    },
    reduce(value: boolean) {
      act(() => {
        reduced = value;
        listeners.forEach((listener) => listener());
      });
    },
  };
}
describe("ONE logo animation lifecycle", () => {
  it("removes loading stroke styles before the error or success choreography takes over", () => {
    const clock = animationEnvironment();
    const view = render(<AuthLogo state="loading" />);
    clock.tick(100);
    clock.tick(116);
    const light = document.querySelector(".auth-arc-light")!;
    expect(light.hasAttribute("style")).toBe(true);
    view.rerender(<AuthLogo state="error" />);
    expect(light.hasAttribute("style")).toBe(false);
    expect(clock.frames.size).toBe(0);
    view.rerender(<AuthLogo state="success" />);
    expect(clock.frames.size).toBe(0);
  });
  it("responds to a live reduced-motion change and stops all frame work on unmount", () => {
    const clock = animationEnvironment();
    const view = render(
      <MotionConfig reducedMotion="user">
        <AuthLogo state="loading" />
      </MotionConfig>,
    );
    clock.tick(100);
    clock.tick(116);
    clock.reduce(true);
    expect(
      document.querySelector(".auth-mark")!.getAttribute("data-reduced"),
    ).toBe("true");
    expect(clock.frames.size).toBe(0);
    clock.reduce(false);
    expect(clock.frames.size).toBe(1);
    view.unmount();
    expect(clock.frames.size).toBe(0);
  });
});
