// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { createDemo, DEMO_KEY } from "./support/demo";
import { chooseOption } from "./select-field-helpers";
vi.mock("../src/lib/auth", () => ({
  signIn: vi.fn(),
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}));
beforeEach(() => {
  localStorage.clear();
  location.hash = "/";
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const saved = () => JSON.parse(localStorage.getItem(DEMO_KEY)!);
async function start() {
  const state = createDemo("Asia/Kuala_Lumpur"),
    project = state.projects[0],
    task = state.tasks[0],
    note = state.notes[0];
  project.title = "House Renovation";
  project.tags = ["home"];
  task.title = "Survey SPC";
  task.projectId = project.id;
  task.tags = ["testing"];
  note.tags = ["home"];
  state.tagCatalog.push({
    id: crypto.randomUUID(),
    name: "unused",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  return { state, task, project, note };
}
async function nav(name: string) {
  await userEvent.click(screen.getAllByRole("button", { name })[0]);
  await screen.findByRole(
    "heading",
    { name: name + ".", level: 1 },
    { timeout: 5000 },
  );
}
test("task tags preserve the project badge and Schedule in Log keeps unsaved task and log drafts", async () => {
  const { task } = await start();
  await nav("Tasks");
  const card = screen
    .getByRole("button", { name: "Open task Survey SPC" })
    .closest("article")!;
  expect(within(card).getByText("House Renovation")).toBeTruthy();
  expect(within(card).getByText("#testing")).toBeTruthy();
  await userEvent.click(
    within(card).getByRole("heading", { name: "Survey SPC" }),
  );
  let dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).queryByText(/Notes, updates and linked time blocks/),
  ).toBeNull();
  await userEvent.clear(within(dialog).getByRole("textbox", { name: "Title" }));
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Title" }),
    "Task draft retained",
  );
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Write a log entry" }),
    "Log draft retained",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Schedule" }),
  );
  dialog = await screen.findByRole("dialog", { name: "NEW TIME BLOCK" });
  expect(
    within(dialog).getByRole("button", { name: /Back to task/ }),
  ).toBeTruthy();
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Create time block" }),
  );
  dialog = await screen.findByRole("dialog", { name: "EDIT TASK" });
  expect(
    (within(dialog).getByRole("textbox", { name: "Title" }) as HTMLInputElement)
      .value,
  ).toBe("Task draft retained");
  expect(
    (
      within(dialog).getByRole("textbox", {
        name: "Write a log entry",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Log draft retained");
  expect(
    saved().blockTaskLinks.some(
      (l: { taskId: string }) => l.taskId === task.id,
    ),
  ).toBe(true);
});
test("Tags has a standalone graph with item filters, keyboard selection and camera controls", async () => {
  const { state } = await start();
  await nav("Tags");
  const home = await screen.findByRole(
    "button",
    { name: /Tag #home,/ },
    { timeout: 5000 },
  );
  await userEvent.keyboard("{Tab}");
  home.focus();
  await userEvent.keyboard("{Enter}");
  const detail = screen.getByRole("complementary", {
    name: "Selected graph item",
  });
  expect(within(detail).getByRole("heading", { name: /home/ })).toBeTruthy();
  expect(within(detail).getByText("Survey SPC")).toBeTruthy();
  const previous = screen.getByLabelText("Graph zoom").textContent;
  await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByLabelText("Graph zoom").textContent).not.toBe(previous);
  await userEvent.click(screen.getByRole("button", { name: "Fit graph" }));
  await chooseOption(document.body, "Item type", "Notes");
  await waitFor(() =>
    expect(
      document.querySelectorAll('.graph-node[data-kind="task"]').length,
    ).toBe(0),
  );
  expect(
    document.querySelectorAll('.graph-node[data-kind="note"]').length,
  ).toBeGreaterThan(0);
  expect(saved()).toEqual(state);
});
test("tags can be created, merged on rename and removed while keeping their connected records", async () => {
  const { state } = await start();
  await nav("Tags");
  await screen.findByRole("button", { name: /Tag #home,/ }, { timeout: 5000 });
  await userEvent.click(screen.getByRole("button", { name: "New tag" }));
  let dialog = await screen.findByRole("dialog", { name: "New tag" });
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Tag name" }),
    "new-label",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Create tag" }),
  );
  await screen.findByRole(
    "button",
    { name: /Tag #new-label,/ },
    { timeout: 5000 },
  );
  await userEvent.click(screen.getByRole("button", { name: /Tag #home,/ }));
  await userEvent.click(screen.getByRole("button", { name: "Rename" }));
  dialog = await screen.findByRole("dialog", { name: "Rename tag" });
  await userEvent.clear(
    within(dialog).getByRole("textbox", { name: "Tag name" }),
  );
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Tag name" }),
    "new-label",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Save tag" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Tag #home,/ })).toBeNull(),
  );
  expect(saved().notes[0].tags).toContain("new-label");
  await userEvent.click(
    await screen.findByRole(
      "button",
      { name: "Remove tag #new-label" },
      { timeout: 5000 },
    ),
  );
  const confirm = await screen.findByRole("alertdialog");
  await userEvent.click(
    within(confirm).getByRole("button", { name: "Remove tag" }),
  );
  await waitFor(() => expect(saved().notes[0].tags).not.toContain("new-label"));
  expect(saved().tasks).toHaveLength(state.tasks.length);
  expect(saved().notes).toHaveLength(state.notes.length);
});

test("the picker selects existing tags and creates one without losing comma-containing names", async () => {
  const { task } = await start();
  await nav("Tasks");
  const card = screen
    .getByRole("button", { name: "Open task Survey SPC" })
    .closest("article")!;
  await userEvent.click(
    within(card).getByRole("heading", { name: "Survey SPC" }),
  );
  const editor = await screen.findByRole("dialog", { name: "EDIT TASK" });
  await userEvent.click(
    within(editor).getByRole("button", { name: "Choose tags" }),
  );
  const picker = await screen.findByRole("dialog", { name: "Choose tags" });
  await userEvent.click(
    await within(picker).findByRole("option", { name: "home" }),
  );
  expect(
    saved().tasks.find((t: { id: string }) => t.id === task.id).tags,
  ).toEqual(["testing"]);
  await userEvent.type(
    within(picker).getByRole("textbox", { name: "Search tags" }),
    "deep, focus",
  );
  await userEvent.click(
    await within(picker).findByRole("button", {
      name: 'Create tag "deep, focus"',
    }),
  );
  await waitFor(() => expect(saved().tagCatalog.some((t: {name:string}) => t.name === "deep, focus")).toBe(true));
  await userEvent.click(within(picker).getByRole("button", { name: "Done" }));
  await within(editor).findByRole("button", { name: "Remove tag deep, focus" });
  expect(
    within(editor).getByRole("button", { name: "Save changes" }),
  ).toBeTruthy();
  await userEvent.click(
    within(editor).getByRole("button", { name: "Save changes" }),
  );
  await waitFor(() =>
    expect(
      saved().tasks.find((t: { id: string }) => t.id === task.id).tags,
    ).toEqual(["testing", "home", "deep, focus"]),
  );
});
test("the Tags list opens complete connections and remembers its view", async () => {
  const { note } = await start();
  await nav("Tags");
  await userEvent.click(screen.getByRole("button", { name: "List" }));
  await screen.findByRole(
    "button",
    { name: "View items tagged #home" },
    { timeout: 5000 },
  );
  await userEvent.click(
    screen.getByRole("button", { name: "View items tagged #home" }),
  );
  await screen.findByRole(
    "button",
    { name: "Open task Survey SPC" },
    { timeout: 5000 },
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Open note " + note.title }),
  );
  const dialog = await screen.findByRole("dialog", { name: "EDIT NOTE" });
  expect(
    within(dialog).getByRole("button", { name: "Choose tags" }),
  ).toBeTruthy();
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Close dialog" }),
  );
  await nav("Tasks");
  await nav("Tags");
  await screen.findByRole(
    "button",
    { name: "Open note " + note.title },
    { timeout: 5000 },
  );
  expect(
    screen.queryByRole("group", { name: "Tag relationship graph" }),
  ).toBeNull();
});
