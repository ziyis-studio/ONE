// @vitest-environment jsdom
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { useEditorDraft, readDrafts } from "../src/lib/drafts";
const defaults = {
  title: "Original",
  description: "",
  content: "",
  tags: "",
  projectId: "",
  deadline: "",
  status: "active" as const,
  initialStage: "todo" as const,
  icon: "folder",
  emotion: "",
  weekdays: [1],
  startsOn: "",
  endsOn: "",
  neverEnd: true,
  start: "",
  end: "",
  awake: 0,
  sleepNote: "",
  taskIds: [],
  fields: [],
  noteId: "",
  values: {},
  newConditions: [],
  condition: "",
};
function DraftEditor() {
  const [values, setValues] = useState(defaults);
  const draft = useEditorDraft({
    scope: "test",
    editor: { kind: "task" },
    revision: "version-1",
    signature: JSON.stringify(values),
    dirty: values.title !== "Original",
    restore: (v) => setValues(v as typeof defaults),
  });
  return (
    <>
      <input
        aria-label="Draft title"
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
      />
      <p>{draft.status}</p>
      <button onClick={() => draft.discard()}>Discard</button>
    </>
  );
}
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test("flushes drafts on unmount, restores all editor fields and permits a fresh draft after discard", async () => {
  const view = render(<DraftEditor />);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "First draft" },
  });
  view.unmount();
  expect(readDrafts("test")[0].values.title).toBe("First draft");
  const restored = render(<DraftEditor />);
  await waitFor(() =>
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
      "First draft",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  expect(readDrafts("test")).toEqual([]);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Second draft" },
  });
  restored.unmount();
  expect(readDrafts("test")[0].values.title).toBe("Second draft");
  expect(readDrafts("another-account")).toEqual([]);
});
