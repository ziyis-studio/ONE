// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  render,
  screen,
  within,
  cleanup,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
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
async function open() {
  localStorage.setItem(
    DEMO_KEY,
    JSON.stringify(createDemo("Asia/Kuala_Lumpur")),
  );
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
  await userEvent.click(screen.getAllByRole("button", { name: "Meals" })[0]);
  await screen.findByRole("heading", { name: "Meals." });
  await screen.findByText(
    "A little room for your next meal",
    {},
    { timeout: 5000 },
  );
}
test("records text with zero calories, keeps unknown nutrition blank and edits without duplicating the meal", async () => {
  await open();
  await userEvent.click(
    screen.getAllByRole("button", { name: "Log a meal" })[0],
  );
  const dialog = await screen.findByRole("dialog", {}, { timeout: 5000 });
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "What did you eat?" }),
    "Soup and toast",
  );
  await userEvent.type(
    within(dialog).getByRole("spinbutton", { name: "Calories (kcal)" }),
    "0",
  );
  await userEvent.type(
    within(dialog).getByRole("spinbutton", { name: "Protein (g)" }),
    "12.5",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Create meal" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 5000,
  });
  const saved = JSON.parse(localStorage.getItem(DEMO_KEY)!).meals[0];
  expect(saved.calories).toBe(0);
  expect(saved.carbs).toBeNull();
  expect(saved.protein).toBe(12.5);
  await userEvent.click(
    await screen.findByRole("button", { name: "Edit meal Lunch" }),
  );
  const edit = await screen.findByRole("dialog");
  expect(
    (
      within(edit).getByRole("spinbutton", {
        name: "Carbs (g)",
      }) as HTMLInputElement
    ).value,
  ).toBe("");
  await userEvent.type(
    within(edit).getByRole("textbox", { name: "Title" }),
    "Quick lunch",
  );
  await userEvent.click(
    within(edit).getByRole("button", { name: "Save changes" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 5000,
  });
  expect(JSON.parse(localStorage.getItem(DEMO_KEY)!).meals).toHaveLength(1);
  expect(
    await screen.findByRole("button", { name: "Edit meal Quick lunch" }),
  ).toBeTruthy();
}, 20000);
test("keeps unfinished meal drafts and prevents sample photo upload from pretending to be saved", async () => {
  await open();
  await userEvent.click(
    screen.getAllByRole("button", { name: "Log a meal" })[0],
  );
  const dialog = await screen.findByRole("dialog", {}, { timeout: 5000 });
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "What did you eat?" }),
    "A meal to finish later",
  );
  await userEvent.upload(
    within(dialog).getByLabelText("Upload meal photos"),
    new File(["jpeg"], "lunch.jpg", { type: "image/jpeg" }),
  );
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Close dialog" }),
  );
  await userEvent.click(
    screen.getAllByRole("button", { name: "Log a meal" })[0],
  );
  const resumed = await screen.findByRole("dialog");
  expect(
    (
      within(resumed).getByRole("textbox", {
        name: "What did you eat?",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("A meal to finish later");
  expect(localStorage.getItem("one-drafts-v1:demo")).toContain(
    "A meal to finish later",
  );
}, 20000);
