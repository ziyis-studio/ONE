// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import {
  DayPicker,
  FilterPicker,
  InlineTitle,
  MorphMenu,
} from "../src/components/interactions";
import { useState } from "react";
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
function Reduced({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="always">{children}</MotionConfig>;
}
describe("ONE useLayouts interactions", () => {
  it("opens a keyboard menu, skips disabled items, restores focus on Escape and dismisses outside", async () => {
    const chosen = vi.fn();
    render(
      <Reduced>
        <MorphMenu
          label="Create"
          trigger="Create"
          items={[
            { label: "Task", onSelect: chosen },
            { label: "Unavailable", onSelect: chosen, disabled: true },
            { label: "Note", onSelect: chosen },
          ]}
        />
        <button>Outside</button>
      </Reduced>,
    );
    const trigger = screen.getByRole("button", { name: "Create" });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const task = await screen.findByRole("menuitem", { name: "Task" });
    await waitFor(() => expect(document.activeElement).toBe(task));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: "Note" }),
    );
    await userEvent.keyboard("{Escape}");
    expect(document.activeElement).toBe(trigger);
    await waitFor(() => expect(screen.queryByRole("menu")).toBe(null));
    await userEvent.click(trigger);
    await screen.findByRole("menu");
    await userEvent.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBe(null));
    expect(chosen).not.toHaveBeenCalled();
  });
  it("keeps the selected project visible and returns keyboard focus after choosing a filter", async () => {
    function Filter() {
      const [value, setValue] = useState("all");
      return (
        <FilterPicker
          label="Filter by project"
          value={value}
          onChange={setValue}
          options={[
            { value: "all", label: "All projects" },
            { value: "work", label: "Work" },
          ]}
        />
      );
    }
    render(
      <Reduced>
        <Filter />
      </Reduced>,
    );
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    await userEvent.click(trigger);
    expect(
      screen
        .getByRole("option", { name: "All projects" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await userEvent.click(screen.getByRole("option", { name: "Work" }));
    expect(trigger.textContent).toContain("Work");
    expect(document.activeElement).toBe(trigger);
    await userEvent.click(trigger);
    expect(
      screen
        .getByRole("option", { name: "Work" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
  it("keeps repeat days multi-selectable through collapse and supports weekday presets", async () => {
    function Picker() {
      const [days, setDays] = useState([1, 2, 3, 4, 5, 6, 7]);
      return <DayPicker value={days} onChange={setDays} />;
    }
    render(
      <Reduced>
        <Picker />
      </Reduced>,
    );
    const summary = screen.getByRole("button", { name: /REPEAT/ });
    await userEvent.click(summary);
    await userEvent.click(screen.getByRole("button", { name: "Weekdays" }));
    expect(
      screen
        .getByRole("button", { name: "Saturday" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    await userEvent.click(screen.getByRole("button", { name: "Saturday" }));
    expect(
      screen
        .getByRole("button", { name: "Saturday" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await userEvent.click(summary);
    await userEvent.click(summary);
    expect(
      screen
        .getByRole("button", { name: "Saturday" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(summary.textContent).toContain("Mon, Tue, Wed, Thu, Fri, Sat");
  });
  it("retains a failed inline rename, retries once and cancels without saving", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection lost. Try again."))
      .mockResolvedValueOnce(undefined);
    render(
      <Reduced>
        <InlineTitle
          kind="task"
          value="Original"
          onSave={save}
          onOpen={vi.fn()}
        />
      </Reduced>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Rename task: Original" }),
    );
    const input = screen.getByRole("textbox", { name: "Rename task" });
    await userEvent.clear(input);
    await userEvent.type(input, "Updated{Enter}");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Connection lost",
    );
    expect((input as HTMLInputElement).value).toBe("Updated");
    await userEvent.click(
      screen.getByRole("button", { name: "Save task title" }),
    );
    await waitFor(() => expect(screen.queryByRole("textbox")).toBe(null));
    expect(save).toHaveBeenNthCalledWith(2, "Updated");
    await userEvent.click(
      screen.getByRole("button", { name: "Rename task: Original" }),
    );
    await userEvent.type(screen.getByRole("textbox"), "discard{Escape}");
    expect(save).toHaveBeenCalledTimes(2);
  });
  it("uses the revision captured at edit start and blocks duplicate inline saves", async () => {
    let finish!: () => void;
    const oldRevision = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
      newRevision = vi.fn();
    const view = render(
      <Reduced>
        <InlineTitle
          kind="note"
          value="Original"
          onSave={oldRevision}
          onOpen={vi.fn()}
        />
      </Reduced>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Rename note: Original" }),
    );
    view.rerender(
      <Reduced>
        <InlineTitle
          kind="note"
          value="Changed elsewhere"
          onSave={newRevision}
          onOpen={vi.fn()}
        />
      </Reduced>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "My title" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(oldRevision).toHaveBeenCalledTimes(1);
    expect(newRevision).not.toHaveBeenCalled();
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("textbox")).toBe(null));
  });
});
