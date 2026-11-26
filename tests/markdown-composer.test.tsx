// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mock = vi.hoisted(() => ({
  upload: vi.fn(),
  download: vi.fn(),
  notify: vi.fn(),
  busy: vi.fn(),
  demo: false,
}));
vi.mock("../src/lib/workspace", () => ({
  useOne: () => ({ demo: mock.demo, notify: mock.notify }),
}));
vi.mock("../src/lib/api", () => ({
  uploadAttachment: mock.upload,
  downloadAttachment: mock.download,
}));
import MarkdownNotes from "../src/components/MarkdownNotes";
function Harness({
  initial = "",
  document = false,
}: {
  initial?: string;
  document?: boolean;
}) {
  const [value, onChange] = useState(initial);
  return (
    <MarkdownNotes
      value={value}
      onChange={onChange}
      disabled={false}
      onBusyChange={mock.busy}
      document={document}
      ariaLabel={document ? "Note content" : "Description"}
    />
  );
}
beforeEach(() => {
  mock.demo = false;
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const area = () => screen.getByRole("textbox") as HTMLTextAreaElement;
describe("Shared Markdown composer", () => {
  it("filters slash commands, supports keyboard selection and Escape, and leaves URLs alone", async () => {
    render(<Harness />);
    await userEvent.type(area(), "/heading");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(area().value).toBe("## ");
    expect(screen.queryByRole("listbox")).toBe(null);
    fireEvent.change(area(), {
      target: {
        value: "https://example.com/",
        selectionStart: 20,
        selectionEnd: 20,
      },
    });
    expect(screen.queryByRole("listbox")).toBe(null);
    await userEvent.clear(area());
    await userEvent.type(area(), "/code");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBe(null);
    expect(area().value).toBe("/code");
    fireEvent.click(area());
    await userEvent.keyboard("{Enter}");
    expect(area().selectionStart).toBe(4);
    await userEvent.type(area(), "const idea = 1;", { skipClick: true });
    expect(area().value).toBe("```\nconst idea = 1;\n```");
  });
  it("renders checklists, tables and code safely in the same document preview", async () => {
    render(
      <Harness
        document
        initial={
          '# Notes\n\n- [x] Finished\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nalert("example")\n```\n\n[unsafe](javascript:alert(1))'
        }
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("heading", { name: "Notes" })).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByRole("table")).toBeTruthy();
    expect(document.querySelector("pre code")?.textContent).toContain(
      'alert("example")',
    );
    expect(document.querySelector('a[href^="javascript:"]')).toBe(null);
  });
  it("inserts a file at the slash position and retains the rest of a document", async () => {
    const ref = "planner-file://10000000-0000-4000-8000-000000000001.pdf";
    mock.upload.mockResolvedValue(ref);
    render(<Harness initial={"Before\n/file\nAfter"} document />);
    area().focus();
    area().setSelectionRange(12, 12);
    fireEvent.click(area());
    await userEvent.click(
      screen.getByRole("option", { name: /File attachment/ }),
    );
    await userEvent.upload(
      screen.getByLabelText("Attach file or image"),
      new File(["%PDF-1.7"], "report.pdf", { type: "application/pdf" }),
    );
    await waitFor(() =>
      expect(area().value).toBe(`Before\n\n[report.pdf](${ref})\nAfter`),
    );
    expect(mock.busy.mock.calls.map((call) => call[0])).toEqual([true, false]);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("button", { name: "report.pdf" })).toBeTruthy();
  });
  it("supports pasted images, preserves text on upload failure, and rejects oversized or demo uploads", async () => {
    const ref = "planner-image://10000000-0000-4000-8000-000000000001.png";
    mock.upload.mockResolvedValueOnce(ref);
    const result = render(<Harness initial="A thought" />);
    const image = new File(["image bytes"], "photo.png", { type: "image/png" });
    fireEvent.paste(area(), { clipboardData: { files: [image] } });
    await waitFor(() => expect(area().value).toContain(`![photo.png](${ref})`));
    const original = area().value;
    mock.upload.mockRejectedValueOnce(new Error("Upload failed. Try again."));
    fireEvent.drop(area().parentElement!, { dataTransfer: { files: [image] } });
    await waitFor(() =>
      expect(mock.notify).toHaveBeenCalledWith(
        "Upload failed. Try again.",
        true,
      ),
    );
    expect(area().value).toBe(original);
    await userEvent.upload(
      screen.getByLabelText("Attach file or image"),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "huge.png", {
        type: "image/png",
      }),
    );
    expect(mock.notify).toHaveBeenLastCalledWith(
      "Choose an image up to 5 MB.",
      true,
    );
    mock.demo = true;
    result.rerender(<Harness initial="A thought" />);
    await userEvent.upload(
      screen.getByLabelText("Attach file or image"),
      image,
    );
    expect(mock.notify).toHaveBeenLastCalledWith(
      "Sign in to attach private files.",
      true,
    );
    expect(mock.upload).toHaveBeenCalledTimes(2);
  });
});
