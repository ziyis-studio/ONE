// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationProvider, useConfirm } from "../src/lib/confirmation";
import { Dialog } from "../src/components/ui";
afterEach(cleanup);
function Example() {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState("");
  return (
    <>
      <button onClick={() => setOpen(true)}>Open editor</button>
      {open && (
        <Dialog title="Editor" dirty={!!title} onClose={() => setOpen(false)}>
          <input
            aria-label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Dialog>
      )}
    </>
  );
}
describe("ONE confirmations", () => {
  it("keeps drafts and restores focus on cancel, then discards only after explicit acceptance", async () => {
    const view = render(
      <ConfirmationProvider>
        <Example />
      </ConfirmationProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open editor" }));
    const input = screen.getByRole("textbox", { name: "Title" });
    await userEvent.type(input, "Keep this draft");
    await userEvent.keyboard("{Escape}");
    let prompt = await screen.findByRole("alertdialog");
    expect(document.activeElement).toBe(
      within(prompt).getByRole("button", { name: "Keep editing" }),
    );
    expect(view.container.inert).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect((input as HTMLInputElement).value).toBe("Keep this draft");
    expect(document.activeElement).toBe(input);
    expect(view.container.inert).toBe(false);
    await userEvent.keyboard("{Escape}");
    prompt = await screen.findByRole("alertdialog");
    await userEvent.tab();
    expect(document.activeElement).toBe(
      within(prompt).getByRole("button", { name: "Discard changes" }),
    );
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open editor" }),
    );
  });
  it("cancels pending work on unmount and prevents duplicate simultaneous requests", async () => {
    const results = vi.fn();
    function Requester() {
      const confirm = useConfirm();
      return (
        <button
          onClick={() => {
            void confirm({
              title: "Delete?",
              description: "Permanent",
              confirmLabel: "Delete",
            }).then(results);
            void confirm({
              title: "Duplicate",
              description: "No",
              confirmLabel: "Delete",
            }).then(results);
          }}
        >
          Ask
        </button>
      );
    }
    const view = render(
      <ConfirmationProvider>
        <Requester />
      </ConfirmationProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(results).toHaveBeenCalledWith(false);
    view.unmount();
    await waitFor(() => expect(results).toHaveBeenCalledTimes(2));
    expect(document.body.style.overflow).toBe("");
  });
});
