// @vitest-environment jsdom
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntityActivityPanel from "../src/components/EntityActivityPanel";
import { emptyWorkspace } from "../src/domain/model";
import { readActivities, readLogDrafts } from "../src/lib/activity";
import { chooseOption } from "./select-field-helpers";
const mock = vi.hoisted(() => ({ context: null as any, api: vi.fn() }));
vi.mock("../src/lib/workspace", () => ({ useOne: () => mock.context }));
vi.mock("../src/lib/api", () => ({ api: mock.api }));
const task = "10000000-0000-4000-8000-000000000001",
  project = "10000000-0000-4000-8000-000000000002",
  note = "10000000-0000-4000-8000-000000000003";
beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  mock.api.mockImplementation(async (_path, _token, options) => {
    const e = JSON.parse(options.body).entry;
    return {
      id: e.id,
      target_kind: e.kind,
      target_id: e.targetId,
      body: e.body.trim(),
      created_at: new Date().toISOString(),
    };
  });
  Element.prototype.scrollTo = vi.fn();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const data = emptyWorkspace(),
    stamp = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  data.projects.push({
    ...stamp,
    id: project,
    title: "Project",
    description: "",
    completedAt: null,
  });
  data.tasks.push({
    ...stamp,
    id: task,
    title: "Child task",
    description: "",
    projectId: project,
    deadline: null,
    completedAt: null,
    startedAt: null,
  });
  data.notes.push({
    ...stamp,
    id: note,
    title: "Research",
    content: "Keep this content",
    tags: ["Research"],
  });
  data.noteLinks.push({
    ...stamp,
    id: crypto.randomUUID(),
    noteId: note,
    projectId: project,
    taskId: null,
    thoughtId: null,
    targetNoteId: null,
  });
  mock.context = {
    data,
    demo: true,
    scope: "demo",
    zone: "Asia/Kuala_Lumpur",
    busy: false,
    execute: vi.fn().mockResolvedValue({}),
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("task entries persist, roll up to the parent with their source, and unsent drafts survive reopening", async () => {
  const open = vi.fn();
  let view = render(
    <EntityActivityPanel kind="task" id={task} onOpen={open} />,
  );
  await screen.findByText("No entries yet.");
  fireEvent.change(screen.getByRole("textbox", { name: "Write a log entry" }), {
    target: { value: "  Finished the first draft  " },
  });
  await userEvent.click(screen.getByRole("button", { name: "Add log" }));
  expect(readActivities("demo").map((r) => r.body)).toEqual([
    "Finished the first draft",
  ]);
  fireEvent.change(screen.getByRole("textbox", { name: "Write a log entry" }), {
    target: { value: "Next step" },
  });
  view.unmount();
  expect(readLogDrafts("demo")[0].body).toBe("Next step");
  view = render(
    <EntityActivityPanel kind="project" id={project} onOpen={open} />,
  );
  await screen.findByText("Finished the first draft");
  await userEvent.click(screen.getByRole("button", { name: "Child task" }));
  expect(open).toHaveBeenCalledWith({ kind: "task", id: task });
  await userEvent.click(screen.getByRole("button", { name: "Refresh log" }));
  await waitFor(() =>
    expect(screen.getAllByText("Finished the first draft")).toHaveLength(1),
  );
  expect(screen.getByRole("button", { name: /^Research/ })).toBeTruthy();
  view.unmount();
  render(<EntityActivityPanel kind="task" id={task} onOpen={open} />);
  expect(
    (
      screen.getByRole("textbox", {
        name: "Write a log entry",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Next step");
});
test("linking an existing note preserves its contents, tags and other targets", async () => {
  const { container } = render(
    <EntityActivityPanel kind="task" id={task} onOpen={vi.fn()} />,
  );
  await chooseOption(container, "Link a note", "Research");
  expect(mock.context.execute).toHaveBeenCalledWith({
    type: "note.save",
    id: note,
    expectedUpdatedAt: mock.context.data.notes[0].updatedAt,
    input: {
      title: "Research",
      content: "Keep this content",
      tags: ["Research"],
      targets: [
        { kind: "project", id: project },
        { kind: "task", id: task },
      ],
    },
  });
});
test("a failed cloud post keeps the draft and retries with the same identity", async () => {
  mock.context = {
    ...mock.context,
    demo: false,
    scope: "account",
    session: { access_token: "token" },
  };
  mock.api
    .mockResolvedValueOnce({ items: [], next: null })
    .mockRejectedValueOnce(new Error("Offline"));
  render(<EntityActivityPanel kind="task" id={task} onOpen={vi.fn()} />);
  await screen.findByText("No entries yet.");
  fireEvent.change(screen.getByRole("textbox", { name: "Write a log entry" }), {
    target: { value: "Keep me" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Add log" }));
  await screen.findByText("Offline");
  const saved = readLogDrafts("account")[0];
  expect(saved.body).toBe("Keep me");
  mock.api.mockResolvedValueOnce({
    id: saved.entryId,
    target_kind: "task",
    target_id: task,
    body: "Keep me",
    created_at: new Date().toISOString(),
  });
  await userEvent.click(screen.getByRole("button", { name: "Add log" }));
  await waitFor(() => expect(readLogDrafts("account")).toEqual([]));
  expect(JSON.parse(mock.api.mock.calls[1][2].body).id).toBe(
    JSON.parse(mock.api.mock.calls[2][2].body).id,
  );
});
test("a cloud load failure stays beside the log, retries successfully and shows saved entries", async () => {
  mock.context = {
    ...mock.context,
    demo: false,
    scope: "account",
    session: { access_token: "token" },
  };
  mock.api.mockRejectedValueOnce(
    Object.assign(new Error("Invalid request."), { code: "invalid" }),
  );
  render(<EntityActivityPanel kind="project" id={project} onOpen={vi.fn()} />);
  const error = await screen.findByRole("alert");
  expect(error.closest(".entity-log-section")).toBeTruthy();
  expect(error.textContent).toContain("Could not load the log");
  expect(screen.queryByText("No entries yet.")).toBeNull();
  const row = {
    id: crypto.randomUUID(),
    target_kind: "project",
    target_id: project,
    body: "Already saved in the cloud",
    created_at: "2026-11-19T16:45:58.193467+00:00",
  };
  mock.api.mockResolvedValueOnce({ items: [row], next: null });
  await userEvent.click(
    screen.getByRole("button", { name: "Retry loading log" }),
  );
  await screen.findByText(row.body);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(mock.api.mock.calls[1][0]).toBe(
    `/v1/activity?kind=project&id=${project}`,
  );
});
