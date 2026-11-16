// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DateTimeField,
  invalidDateField,
} from "../src/components/DateTimeField";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function Example({
  initial = "2026-11-15T23:07",
  required = true,
  min,
  withTime = true,
}: {
  initial?: string;
  required?: boolean;
  min?: string;
  withTime?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(invalidDateField(event.currentTarget)?.message || "Saved");
      }}
    >
      <DateTimeField
        label="Rest"
        value={value}
        onChange={setValue}
        today="2026-11-16"
        required={required}
        min={min}
        withTime={withTime}
      />
      <output aria-label="Canonical value">{value}</output>
      <button type="submit">Save</button>
      <p role="status" aria-label="Save result">
        {error}
      </p>
    </form>
  );
}
describe("shared ONE date and time field", () => {
  it("edits precise minutes without native date inputs or timezone conversion", async () => {
    const { container } = render(<Example />);
    expect(
      [
        ...container.querySelectorAll(
          'input[type="date"],input[type="datetime-local"],input[type="time"]',
        ),
      ].every((input) => input.closest('[aria-hidden="true"]')),
    ).toBe(true);
    const minute = screen.getByRole("spinbutton", { name: /minute/i });
    fireEvent.keyDown(minute, { key: "ArrowUp" });
    expect(screen.getByLabelText("Canonical value").textContent).toBe(
      "2026-11-15T23:08",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByRole("status", { name: "Save result" }).textContent,
    ).toBe("Saved");
  });
  it("rejects incomplete required segments and dates earlier than the minimum", async () => {
    const { unmount } = render(<Example initial="" withTime={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByRole("status", { name: "Save result" }).textContent,
    ).toContain("Choose a complete, valid date");
    unmount();
    render(<Example initial="2026-11-15" min="2026-11-16" withTime={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByRole("status", { name: "Save result" }).textContent,
    ).toContain("Choose a complete, valid date");
  });
  it("allows empty optional dates, blocks partial edits, and clears through the custom calendar", async () => {
    const { container } = render(
      <Example initial="" required={false} withTime={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByRole("status", { name: "Save result" }).textContent,
    ).toBe("Saved");
    await userEvent.click(screen.getByRole("spinbutton", { name: /month/i }));
    await userEvent.keyboard("11");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByRole("status", { name: "Save result" }).textContent,
    ).toContain("Choose a complete");
    await userEvent.click(
      container.querySelector<HTMLButtonElement>(".one-date-trigger")!,
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Clear",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText("Canonical value").textContent).toBe("");
    expect(
      screen.getByRole("status", { name: "Save result" }).textContent,
    ).toBe("Saved");
  });
  it("keeps an incomplete popover time open and explains what to complete", async () => {
    const { container } = render(<Example />);
    await userEvent.click(
      container.querySelector<HTMLButtonElement>(".one-date-trigger")!,
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("spinbutton", { name: /minute/i }),
    );
    await userEvent.keyboard("{Backspace}");
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(within(dialog).getByRole("alert").textContent).toBe(
      "Complete the hour and minute.",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.keyboard("08");
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.getByLabelText("Canonical value").textContent).toBe(
      "2026-11-15T23:08",
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
  });
  it("opens the custom calendar, preserves the exact time on a day change, and dismisses with Escape", async () => {
    const { container } = render(<Example />);
    await userEvent.click(
      container.querySelector<HTMLButtonElement>(".one-date-trigger")!,
    );
    const dialog = await screen.findByRole("dialog");
    const day = within(dialog).getByRole("button", {
      name: /Monday, 16 November 2026/,
    });
    await userEvent.click(day);
    expect(screen.getByLabelText("Canonical value").textContent).toBe(
      "2026-11-16T23:07",
    );
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBe(null);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        container.querySelector(".one-date-trigger"),
      ),
    );
  });
});
