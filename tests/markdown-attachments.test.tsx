// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mock = vi.hoisted(() => ({
  upload: vi.fn(),
  notify: vi.fn(),
  busy: vi.fn(),
}));
vi.mock("../src/lib/workspace", () => ({
  useOne: () => ({ demo: false, notify: mock.notify }),
}));
vi.mock("../src/lib/api", () => ({
  uploadAttachment: mock.upload,
  downloadAttachment: vi.fn(),
}));
import MarkdownNotes from "../src/components/MarkdownNotes";
function Harness() {
  const [value, onChange] = useState("Existing context");
  return (
    <MarkdownNotes
      value={value}
      onChange={onChange}
      disabled={false}
      onBusyChange={mock.busy}
    />
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
test("private uploads preserve existing notes, insert an opaque reference, and preview a download action", async () => {
  const ref = "planner-file://10000000-0000-4000-8000-000000000001.pdf";
  mock.upload.mockResolvedValue(ref);
  render(<Harness />);
  await userEvent.upload(
    screen.getByLabelText("Attach file or image"),
    new File(["%PDF-1.7"], "report.pdf", { type: "application/pdf" }),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole("textbox", {
          name: "Description",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Existing context\n\n[report.pdf](" + ref + ")"),
  );
  expect(mock.busy.mock.calls.map((call) => call[0])).toEqual([true, false]);
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByRole("button", { name: "report.pdf" })).toBeTruthy();
  expect(mock.notify).not.toHaveBeenCalled();
});
test("a failed upload keeps the note intact and reports the server error", async () => {
  mock.upload.mockRejectedValue(
    new Error("File contents do not match the selected format."),
  );
  render(<Harness />);
  await userEvent.upload(
    screen.getByLabelText("Attach file or image"),
    new File(["invalid"], "report.pdf", { type: "application/pdf" }),
  );
  await waitFor(() =>
    expect(mock.notify).toHaveBeenCalledWith(
      "File contents do not match the selected format.",
      true,
    ),
  );
  expect(
    (
      screen.getByRole("textbox", {
        name: "Description",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Existing context");
  expect(mock.busy).toHaveBeenLastCalledWith(false);
});
