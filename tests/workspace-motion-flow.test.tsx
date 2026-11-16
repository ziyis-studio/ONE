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
import { createDemo, DEMO_KEY } from "../src/lib/demo";
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
