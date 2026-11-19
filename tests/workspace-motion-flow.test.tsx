// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import App from "../src/App";
import { createDemo, DEMO_KEY } from "./support/demo";
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
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ current: { temperature_2m: 28, weather_code: 2 } }),
    ),
  );
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function saved() {
  return JSON.parse(localStorage.getItem(DEMO_KEY)!);
}
async function demo() {
  const state = createDemo("Asia/Kuala_Lumpur");
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  render(
    <MotionConfig reducedMotion="always">
      <App />
    </MotionConfig>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  return state;
}
describe("workspace motion with real commands", () => {
  it("expands actual project tasks and updates the logo progress ring after completion", async () => {
    const state = await demo();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Projects" })[0],
    );
    const card = (
      await screen.findByRole("heading", { name: "A slower kind of Sunday" })
    ).closest("article")!;
    expect(
      within(card).getByRole("img", { name: "50% complete" }),
    ).toBeTruthy();
    await userEvent.click(
      within(card).getByRole("button", { name: "View tasks" }),
    );
    expect(screen.queryByRole("dialog")).toBe(null);
    await userEvent.click(
      within(card).getByRole("button", {
        name: "Complete Make a little room to think",
      }),
    );
    await waitFor(() =>
      expect(
        within(card).getByRole("img", { name: "100% complete" }),
      ).toBeTruthy(),
    );
    const task = state.tasks.find(
      (t) => t.title === "Make a little room to think",
    )!;
    expect(
      saved().tasks.find((t: { id: string }) => t.id === task.id).completedAt,
    ).toBeTruthy();
    await userEvent.click(
      within(card).getByRole("button", { name: "Hide tasks" }),
    );
    expect(
      within(card).queryByRole("button", {
        name: "Reopen Make a little room to think",
      }),
    ).toBe(null);
  });
  it("opens a project from its card surface and keeps metadata and edit controls intact", async () => {
    const state = await demo();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Projects" })[0],
    );
    const project = state.projects[0];
    const card = (
      await screen.findByRole("heading", { name: project.title })
    ).closest("article")!;
    expect(
      within(card).queryByRole("button", {
        name: "Actions for " + project.title,
      }),
    ).toBe(null);
    expect(card.querySelector("footer")).toBe(null);
    expect(
      card.querySelector(".project-card-top .one-project-heading h3")
        ?.textContent,
    ).toBe(project.title);
    await userEvent.click(card);
    const dialog = await screen.findByRole("dialog", { name: "EDIT PROJECT" });
    expect(
      (
        within(dialog).getByRole("textbox", {
          name: "Title",
        }) as HTMLInputElement
      ).value,
    ).toBe(project.title);
    const fields = dialog.querySelector(".editor-status-fields")!,
      description = within(dialog).getByRole("textbox", {
        name: "Description",
      });
    expect(
      fields.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close dialog" }),
    );
    expect(document.querySelector(".project-board .lane-add")).toBe(null);
    expect(
      screen.getAllByRole("button", { name: /^Add project in / }).length,
    ).toBe(3);
    await userEvent.click(
      screen.getByRole("button", { name: "Add project in On hold" }),
    );
    const creation = await screen.findByRole("dialog", { name: "NEW PROJECT" });
    expect(
      (
        within(creation).getByRole("textbox", {
          name: "Title",
        }) as HTMLInputElement
      ).value,
    ).toBe("");
    await userEvent.click(
      within(creation).getByRole("button", { name: "Close dialog" }),
    );
    await userEvent.click(
      within(card).getByRole("button", { name: "View tasks" }),
    );
    expect(screen.queryByRole("dialog")).toBe(null);
    await userEvent.click(
      within(card).getByRole("button", {
        name: "Rename project: " + project.title,
      }),
    );
    expect(
      within(card).getByRole("textbox", { name: "Rename project" }),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBe(null);
  });
  it("toggles a project task immediately while preserving and saving the project draft", async () => {
    const state = await demo();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Projects" })[0],
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Open project ONE Workspace" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "EDIT PROJECT" });
    const title = within(dialog).getByRole("textbox", { name: "Title" });
    await userEvent.clear(title);
    await userEvent.type(title, "An unfinished project draft");
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "Complete Explore a new direction",
      }),
    );
    await within(dialog).findByRole("button", {
      name: "Reopen Explore a new direction",
    });
    expect((title as HTMLInputElement).value).toBe(
      "An unfinished project draft",
    );
    expect(screen.getByRole("dialog", { name: "EDIT PROJECT" })).toBe(dialog);
    const task = state.tasks.find(
      (t) => t.title === "Explore a new direction",
    )!;
    expect(
      saved().tasks.find((t: { id: string }) => t.id === task.id).completedAt,
    ).toBeTruthy();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() =>
      expect(
        saved().projects.find((p: { id: string }) => p.id === task.projectId)
          .title,
      ).toBe("An unfinished project draft"),
    );
  });
  it("opens a task by keyboard or background click without stealing checkbox actions or drag completion", async () => {
    const state = await demo();
    await userEvent.click(screen.getAllByRole("button", { name: "Tasks" })[0]);
    const task = state.tasks.find(
      (item) => item.title === "Make a little room to think",
    )!;
    let card = (
      await screen.findByRole("heading", { name: task.title })
    ).closest("article")!;
    expect(
      within(card).queryByRole("button", { name: "Actions for " + task.title }),
    ).toBe(null);
    expect(document.querySelector(".task-board .lane-add")).toBe(null);
    await userEvent.click(
      within(card).getByRole("button", { name: "Toggle " + task.title }),
    );
    await waitFor(() =>
      expect(
        saved().tasks.find((item: { id: string }) => item.id === task.id)
          .completedAt,
      ).toBeTruthy(),
    );
    expect(screen.queryByRole("dialog")).toBe(null);
    // The exiting source card can remain mounted during the board transition.
    card = screen
      .getByRole("button", { name: "Toggle " + task.title, pressed: true })
      .closest("article")!;
    const open = within(card).getByRole("button", {
      name: "Open task " + task.title,
    });
    open.focus();
    await userEvent.keyboard(" ");
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    open.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "EDIT TASK" });
    expect(
      (
        within(dialog).getByRole("textbox", {
          name: "Title",
        }) as HTMLInputElement
      ).value,
    ).toBe(task.title);
  });
  it("filters real task cards and renames one without losing its details or project", async () => {
    const state = await demo();
    await userEvent.click(screen.getAllByRole("button", { name: "Tasks" })[0]);
    await userEvent.click(
      await screen.findByRole("button", { name: "Filter by project" }),
    );
    await userEvent.click(
      screen.getByRole("option", { name: "ONE Workspace" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Make a little room to think" }),
      ).toBe(null),
    );
    const task = state.tasks.find(
      (t) => t.title === "Explore a new direction",
    )!;
    await userEvent.click(
      screen.getByRole("button", {
        name: "Rename task: Explore a new direction",
      }),
    );
    const field = screen.getByRole("textbox", { name: "Rename task" });
    await userEvent.clear(field);
    await userEvent.type(field, "Explore one clear direction{Enter}");
    await screen.findByRole("heading", { name: "Explore one clear direction" });
    const after = saved().tasks.find((t: { id: string }) => t.id === task.id);
    expect(after).toMatchObject({
      title: "Explore one clear direction",
      projectId: task.projectId,
      description: task.description,
      tags: task.tags,
      deadline: task.deadline,
    });
    await userEvent.click(screen.getByRole("button", { name: "List" }));
    expect(
      await screen.findByRole("button", {
        name: "Explore one clear direction",
      }),
    ).toBeTruthy();
  });
  it("switches Home thought previews without writing records and opens the correct creation editor", async () => {
    const state = await demo();
    await userEvent.click(screen.getByRole("button", { name: "Linked" }));
    expect(await screen.findByText("No linked thoughts")).toBeTruthy();
    expect(saved().thoughts).toEqual(state.thoughts);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "A note" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("NEW NOTE")).toBeTruthy();
    expect(document.activeElement).toBe(
      within(dialog).getByRole("textbox", { name: "Title" }),
    );
  });
});
