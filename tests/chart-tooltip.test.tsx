// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { ChartTooltipScope } from "../src/components/ChartTooltip";
beforeEach(() =>
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows the same real data on hover and focus, and dismisses with Escape", async () => {
  render(
    <MotionConfig reducedMotion="always">
      <ChartTooltipScope>
        <button
          data-chart-title="Monday, Nov 16"
          data-chart-detail="7h 21m net sleep"
        >
          Sleep
        </button>
        <button>Other</button>
      </ChartTooltipScope>
    </MotionConfig>,
  );
  const mark = screen.getByRole("button", { name: "Sleep" });
  await userEvent.hover(mark);
  expect((await screen.findByRole("tooltip")).textContent).toContain(
    "7h 21m net sleep",
  );
  expect(mark.getAttribute("aria-describedby")).toBeTruthy();
  await userEvent.unhover(mark);
  await waitFor(() => expect(screen.queryByRole("tooltip")).toBe(null));
  await userEvent.tab();
  expect(document.activeElement).toBe(mark);
  expect(screen.getByRole("tooltip")).toBeTruthy();
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("tooltip")).toBe(null));
  expect(mark.getAttribute("aria-describedby")).toBe(null);
});
