// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectField, MultiSelectField } from "../src/components/SelectField";
import { Dialog } from "../src/components/ui";
const options = [
  { value: "", label: "No project" },
  { value: "one", label: "ONE" },
  { value: "two", label: "Personal" },
];
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
function Example({ multiple = false }: { multiple?: boolean }) {
  const [value, setValue] = useState("");
  const [values, setValues] = useState<string[]>([]);
  return (
    <Dialog title="Editor" onClose={vi.fn()}>
      {multiple ? (
        <MultiSelectField
          label="Tasks"
          value={values}
          onChange={setValues}
          options={options.slice(1)}
        />
      ) : (
        <SelectField
          label="Project"
          value={value}
          onChange={setValue}
          options={options}
        />
      )}
      <output aria-label="Value">{multiple ? values.join(",") : value}</output>
    </Dialog>
  );
}
describe("standard ONE selects", () => {
  it("selects by keyboard and closes its own list before the editor", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: /Project/ });
    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByLabelText("Value").textContent).toBe("one");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBe(null));
    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Editor" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
  it("supports multiple task selections and explicit deselection", async () => {
    render(<Example multiple />);
    await userEvent.click(screen.getByRole("button", { name: /Tasks/ }));
    const list = await screen.findByRole("listbox");
    await userEvent.click(within(list).getByRole("option", { name: "ONE" }));
    await userEvent.click(
      within(list).getByRole("option", { name: "Personal" }),
    );
    expect(screen.getByLabelText("Value").textContent).toBe("one,two");
    await userEvent.click(within(list).getByRole("option", { name: "ONE" }));
    expect(screen.getByLabelText("Value").textContent).toBe("two");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBe(null));
  });
});
