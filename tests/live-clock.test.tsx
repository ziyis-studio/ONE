// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LiveClock from "../src/components/LiveClock";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T09:12:58.250Z"));
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("live clock seconds", () => {
  it("ticks on the next second boundary and rolls the minute over in the selected time zone", () => {
    const { rerender } = render(<LiveClock zone="Asia/Kuala_Lumpur" />);
    expect(screen.getByLabelText("17:12:58")).toBeTruthy();
    act(() => vi.advanceTimersByTime(749));
    expect(screen.getByLabelText("17:12:58")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByLabelText("17:12:59")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByLabelText("17:13:00")).toBeTruthy();
    rerender(<LiveClock zone="Europe/London" />);
    expect(screen.getByLabelText("09:13:00")).toBeTruthy();
  });
  it("stops its timer when the card unmounts", () => {
    const before = vi.getTimerCount();
    const { unmount } = render(<LiveClock zone="Asia/Kuala_Lumpur" />);
    expect(vi.getTimerCount()).toBeGreaterThan(before);
    unmount();
    expect(vi.getTimerCount()).toBe(before);
  });
});
