// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import * as api from "../src/lib/api";
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
  history.replaceState(null, "", "#/home");
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const saved = () => JSON.parse(localStorage.getItem(DEMO_KEY)!);
async function start(count = 1, gated = false) {
  const state = createDemo("Asia/Kuala_Lumpur"),
    base = state.tasks[0];
  state.tasks = Array.from({ length: count }, (_, index) => ({
    ...base,
    id: index ? crypto.randomUUID() : base.id,
    title: `Today task ${index + 1}`,
    completedAt: null,
  }));
  state.conditions = gated
    ? [{ ...state.conditions[0], taskId: base.id, isMet: false }]
    : [];
  localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  return state;
}
const card = () => document.querySelector<HTMLElement>(".tasks-card")!;
describe("Dashboard completion feedback", () => {
  it("retains the confirmed completed row long enough to show feedback before revealing the next open task", async () => {
    const state = await start(5);
    await userEvent.click(
      within(card()).getByRole("button", { name: "Complete Today task 1" }),
    );
    await waitFor(() =>
      expect(
        saved().tasks.find((t: { id: string }) => t.id === state.tasks[0].id)
          .completedAt,
      ).toBeTruthy(),
    );
    expect(
      within(card())
        .getByRole("button", { name: "Reopen Today task 1" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      within(card()).queryByRole("button", { name: "Focus on Today task 1" }),
    ).toBe(null);
    await waitFor(
      () =>
        expect(
          within(card()).queryByRole("button", { name: "Reopen Today task 1" }),
        ).toBe(null),
      { timeout: 2000 },
    );
    expect(
      within(card()).getByRole("button", { name: "Complete Today task 5" }),
    ).toBeTruthy();
    expect(card().querySelector(".small-count")?.textContent).toBe("1 / 5");
  });
  it("supports reopening a completed task and restores its focus action", async () => {
    await start();
    await userEvent.click(
      within(card()).getByRole("button", { name: "Complete Today task 1" }),
    );
    await userEvent.click(
      await within(card()).findByRole("button", {
        name: "Reopen Today task 1",
      }),
    );
    await waitFor(() => expect(saved().tasks[0].completedAt).toBe(null));
    expect(
      within(card())
        .getByRole("button", { name: "Complete Today task 1" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      within(card()).getByRole("button", { name: "Focus on Today task 1" }),
    ).toBeTruthy();
  });
  it("keeps gated and rejected completions unchecked", async () => {
    await start(1, true);
    await userEvent.click(
      within(card()).getByRole("button", { name: "Complete Today task 1" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "EDIT TASK" });
    expect(saved().tasks[0].completedAt).toBe(null);
    expect(
      card().querySelector('.dashboard-task-check[aria-pressed="true"]'),
    ).toBe(null);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close dialog" }),
    );
    const state = saved();
    state.conditions = [];
    cleanup();
    localStorage.setItem(DEMO_KEY, JSON.stringify(state));
    const original = api.api;
    vi.spyOn(api, "api").mockImplementation(
      async (path, token, options = {}) => {
        if (
          path.startsWith("/v1/sample") &&
          typeof options.body === "string" &&
          JSON.parse(options.body).command?.type === "task.complete"
        )
          throw new Error("Synthetic completion failure");
        return original(path, token, options);
      },
    );
    render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Explore ONE" }),
    );
    await screen.findByRole("heading", { name: "Today." });
    await userEvent.click(
      within(card()).getByRole("button", { name: "Complete Today task 1" }),
    );
    await screen.findByText("Synthetic completion failure");
    expect(saved().tasks[0].completedAt).toBe(null);
    expect(
      within(card())
        .getByRole("button", { name: "Complete Today task 1" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
