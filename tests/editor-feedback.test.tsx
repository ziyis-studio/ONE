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
import { ConfirmationProvider } from "../src/lib/confirmation";
import Editor from "../src/components/Editor";
import { emptyWorkspace } from "../src/domain/model";
const mock = vi.hoisted(() => ({
  context: null as unknown,
  execute: vi.fn(),
  edit: vi.fn(),
}));
vi.mock("../src/lib/workspace", () => ({ useOne: () => mock.context }));
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mock.context = {
    editor: { kind: "task" },
    edit: mock.edit,
    data: emptyWorkspace(),
    execute: mock.execute,
    busy: false,
    notify: vi.fn(),
    zone: "Asia/Kuala_Lumpur",
    today: "2026-11-16",
    reload: vi.fn(),
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function show() {
  return render(
    <MotionConfig reducedMotion="always">
      <ConfirmationProvider>
        <Editor />
      </ConfirmationProvider>
    </MotionConfig>,
  );
}
describe("editor save feedback", () => {
  it("uses custom title feedback without sending an invalid request", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(screen.getByRole("alert").textContent).toContain("Enter a title.");
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Title" }),
    );
    expect(mock.execute).not.toHaveBeenCalled();
  });
  it("continues to allow an untitled thought when its content is present", async () => {
    mock.context = {
      ...(mock.context as Record<string, unknown>),
      editor: { kind: "thought" },
    };
    mock.execute.mockResolvedValueOnce({ snapshot: emptyWorkspace() });
    show();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Your thought" }),
      "A thought without a title",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Create thought" }),
    );
    expect(mock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "thought.create",
        input: expect.objectContaining({
          title: "",
          content: "A thought without a title",
        }),
      }),
    );
    await waitFor(() => expect(mock.edit).toHaveBeenCalledWith(null));
  });
  it("shows pending until the request succeeds, deduplicates and then confirms", async () => {
    let resolve!: (value: unknown) => void;
    mock.execute.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    show();
    const title = screen.getByRole("textbox", { name: "Title" });
    await userEvent.type(title, "A real save");
    const form = title.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mock.execute).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Saving…" }).getAttribute("aria-busy"),
    ).toBe("true");
    expect((title.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(
      true,
    );
    expect(mock.edit).not.toHaveBeenCalled();
    await act(async () => resolve({ snapshot: emptyWorkspace() }));
    expect(screen.getByRole("button", { name: "Saved" })).toBeTruthy();
    await waitFor(() => expect(mock.edit).toHaveBeenCalledWith(null));
  });
  it("does not close a later editor when an earlier pending save resolves after unmount", async () => {
    let resolve!: (value: unknown) => void;
    mock.execute.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const view = show();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Title" }),
      "A pending save",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    view.unmount();
    await act(async () => resolve({ snapshot: emptyWorkspace() }));
    await new Promise((done) => setTimeout(done, 180));
    expect(mock.edit).not.toHaveBeenCalled();
  });
  it("keeps the draft after a failed save and retries the same request", async () => {
    mock.execute
      .mockRejectedValueOnce(new Error("Connection lost. Try again."))
      .mockResolvedValueOnce({ snapshot: emptyWorkspace() });
    show();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Keep this draft",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Connection lost",
    );
    expect(
      (screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement)
        .value,
    ).toBe("Keep this draft");
    expect(mock.edit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mock.execute).toHaveBeenCalledTimes(2);
    expect(mock.execute.mock.calls[0]).toEqual(mock.execute.mock.calls[1]);
    await waitFor(() => expect(mock.edit).toHaveBeenCalledWith(null));
  });
});
