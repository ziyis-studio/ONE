// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeRangeField from "../src/components/TimeRangeField";
import { invalidDateField } from "../src/components/DateTimeField";
function Example({
  initial = "2026-11-21T23:47",
  finish = "2026-11-22T00:17",
}: {
  initial?: string;
  finish?: string;
}) {
  const [start, onStart] = useState(initial),
    [end, onEnd] = useState(finish),
    [error, setError] = useState("");
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(invalidDateField(e.currentTarget)?.message || "Saved");
      }}
    >
      <TimeRangeField
        start={start}
        end={end}
        onStart={onStart}
        onEnd={onEnd}
        today="2026-11-21"
        disabled={false}
      />
      <output aria-label="Start value">{start}</output>
      <output aria-label="End value">{end}</output>
      <button>Save range</button>
      <p role="status" aria-label="Range save result">
        {error}
      </p>
    </form>
  );
}
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("edits precise 24-hour minutes and presets preserve the date across midnight", async () => {
  const { container } = render(<Example />);
  expect(
    [...container.querySelectorAll('input[type="time"]')].every((n) =>
      n.closest('[aria-hidden="true"]'),
    ),
  ).toBe(true);
  const start = container.querySelector<HTMLElement>(
    '.one-time-field[data-date-label="Starts at"]',
  )!;
  const hour = within(start).getByRole("spinbutton", { name: /hour/i });
  expect(hour.getAttribute("aria-valuenow")).toBe("23");
  expect(screen.queryByText("AM")).toBeNull();
  expect(screen.queryByText("PM")).toBeNull();
  fireEvent.keyDown(
    within(start).getByRole("spinbutton", { name: /minute/i }),
    { key: "ArrowUp" },
  );
  expect(screen.getByLabelText("Start value").textContent).toBe(
    "2026-11-21T23:48",
  );
  await userEvent.click(screen.getByRole("button", { name: "1 hr" }));
  expect(screen.getByLabelText("End value").textContent).toBe(
    "2026-11-22T00:48",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save range" }));
  expect(
    screen.getByRole("status", { name: "Range save result" }).textContent,
  ).toBe("Saved");
});
test("changing a shared date moves both ends while incomplete times cannot save", async () => {
  const first = render(
    <Example initial="2026-11-21T09:00" finish="2026-11-21T10:00" />,
  );
  const date = screen.getByRole("group", { name: "Date" });
  fireEvent.keyDown(within(date).getByRole("spinbutton", { name: /day/i }), {
    key: "ArrowUp",
  });
  expect(screen.getByLabelText("Start value").textContent).toBe(
    "2026-11-22T09:00",
  );
  expect(screen.getByLabelText("End value").textContent).toBe(
    "2026-11-22T10:00",
  );
  first.unmount();
  render(<Example initial="2026-11-21T" finish="2026-11-21T10:00" />);
  await userEvent.click(screen.getByRole("button", { name: "Save range" }));
  expect(
    screen.getByRole("status", { name: "Range save result" }).textContent,
  ).toContain("valid time for “Starts at”");
});
