// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  fireEvent,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import App from "../src/App";
import { chooseOption } from "./select-field-helpers";
import { addDays, dayKey, timeKey } from "../src/domain/time";
import { DEMO_KEY } from "../src/lib/demo";
import { dateField, enterDate, readDate } from "./date-field-helpers";
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("../src/lib/auth", () => ({
  signIn,
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
  signIn.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        current: {
          temperature_2m: 28.4,
          weather_code: 2,
          time: "2026-11-16T12:00",
        },
      }),
    ),
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function openDemo() {
  render(
    <MotionConfig reducedMotion="always">
      <App />
    </MotionConfig>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  await screen.findByRole("heading", { name: "Today." });
}
describe("ONE interface flows", () => {
  it("guides email and username login through the password step and exposes provider errors", async () => {
    signIn.mockRejectedValue(new Error("Check your username and password."));
    render(<App />);
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Email or username" }),
      "one-user",
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    const input = await screen.findByLabelText("Password");
    await userEvent.type(input, "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).toHaveBeenCalledWith("one-user", "wrong-password");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Check your email or username and password, then try again.",
    );
    await screen.findByText(
      "Check your email or username and password, then try again.",
    );
  });
  it("opens every workspace module from a populated sample without a cloud request", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        current: {
          temperature_2m: 28,
          weather_code: 2,
          time: "2026-11-16T12:00",
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await openDemo();
    for (const name of [
      "Tasks",
      "Projects",
      "Schedule",
      "Habits",
      "Sleep",
      "Thoughts",
      "Notes",
      "Settings",
    ]) {
      await userEvent.click(screen.getAllByRole("button", { name })[0]);
      await waitFor(
        () =>
          expect(
            screen.getByRole("heading", { name: name + ".", level: 1 }),
          ).toBeTruthy(),
        { timeout: 3000 },
      );
    }
    expect(
      fetch.mock.calls.every((call) =>
        String((call as unknown[])[0]).startsWith(
          "https://api.open-meteo.com/",
        ),
      ),
    ).toBe(true);
  });
  it("saves overnight sleep with exact minutes and closes the calendar before its editor", async () => {
    await openDemo();
    await userEvent.click(screen.getAllByRole("button", { name: "Sleep" })[0]);
    await userEvent.click(
      await screen.findByRole("button", { name: "Log sleep" }),
    );
    const dialog = await screen.findByRole("dialog");
    const start = readDate(dialog, "Fell asleep", true);
    const end = readDate(dialog, "Woke up", true);
    expect(start.slice(0, 10) < end.slice(0, 10)).toBe(true);
    fireEvent.keyDown(
      within(dateField(dialog, "Fell asleep")).getByRole("spinbutton", {
        name: /minute/i,
      }),
      { key: "ArrowUp" },
    );
    await userEvent.click(
      within(dateField(dialog, "Fell asleep")).getByRole("button"),
    );
    await screen.findByRole("dialog", { name: "Fell asleep picker" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Fell asleep picker" })).toBe(
        null,
      ),
    );
    expect(screen.getByRole("dialog", { name: "NEW SLEEP" })).toBeTruthy();
    await enterDate(dialog, "Fell asleep", addDays(start.slice(0, 10), -14));
    await enterDate(dialog, "Woke up", addDays(end.slice(0, 10), -14));
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create sleep" }),
    );
    expect(within(dialog).queryByRole("alert")?.textContent || "").toBe("");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    const records = JSON.parse(localStorage.getItem(DEMO_KEY)!).sleepRecords;
    const record = records.find(
      (item: { startsAt: string; endsAt: string }) =>
        dayKey(item.startsAt, "Asia/Kuala_Lumpur") ===
          addDays(start.slice(0, 10), -14) &&
        timeKey(item.startsAt, "Asia/Kuala_Lumpur") === "23:01",
    );
    expect(record).toBeTruthy();
    expect(timeKey(record.endsAt, "Asia/Kuala_Lumpur")).toBe("07:00");
  });
  it("creates a thought with an emotion and can clear it again", async () => {
    await openDemo();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Thoughts" })[0],
    );
    await screen.findByRole("heading", { name: "Thoughts.", level: 1 });
    await userEvent.click(
      screen.getByRole("button", { name: "Capture a thought" }),
    );
    let dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Your thought" }),
      "One calm thought",
    );
    await userEvent.click(within(dialog).getByRole("radio", { name: "Calm" }));
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create thought" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    let saved = JSON.parse(localStorage.getItem(DEMO_KEY)!).thoughts.find(
      (thought: { content: string }) => thought.content === "One calm thought",
    );
    expect(saved.emotion).toBe("Calm");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Edit thought" })[0],
    );
    dialog = await screen.findByRole("dialog");
    expect(
      (within(dialog).getByRole("radio", { name: "Calm" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    await userEvent.click(
      within(dialog).getByRole("radio", { name: "Just a thought" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    saved = JSON.parse(localStorage.getItem(DEMO_KEY)!).thoughts.find(
      (thought: { content: string }) => thought.content === "One calm thought",
    );
    expect(saved.emotion).toBe(null);
  });
  it("shows optional emotion icons while preserving an existing thought's saved emotion", async () => {
    await openDemo();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Thoughts" })[0],
    );
    await screen.findByRole("heading", { name: "Thoughts.", level: 1 });
    const before = JSON.parse(localStorage.getItem(DEMO_KEY)!);
    const thought = before.thoughts[0];
    await userEvent.click(
      screen.getAllByRole("button", { name: "Edit thought" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("How does it feel?")).toBeTruthy();
    expect(
      (
        within(dialog).getByRole("radio", {
          name: thought.emotion || "Just a thought",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(within(dialog).queryByRole("listbox")).toBe(null);
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Your thought" }),
      " A little more context.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY)!).thoughts.find(
      (item: { id: string }) => item.id === thought.id,
    );
    expect(saved.emotion).toBe(thought.emotion);
    expect(saved.content).toContain("A little more context.");
  });
  it("creates a task and persists it through a workspace reload", async () => {
    await openDemo();
    await userEvent.click(screen.getAllByRole("button", { name: "Tasks" })[0]);
    await userEvent.click(
      await screen.findByRole("button", { name: "New task" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "A meaningful little test",
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "New completion condition" }),
      "Save the first condition",
    );
    await enterDate(dialog, "Due date", "2026-12-25");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create task" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(
      await screen.findByRole("heading", { name: "A meaningful little test" }),
    ).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem("one-demo-v1")!);
    const task = saved.tasks.find(
      (t: { title: string }) => t.title === "A meaningful little test",
    );
    expect(task.deadline).toBe("2026-12-25");
    expect(
      saved.conditions.some(
        (c: { taskId: string; description: string }) =>
          c.taskId === task.id && c.description === "Save the first condition",
      ),
    ).toBe(true);
  });
  it("creates an open-ended habit and switches between a specific end date and Never end", async () => {
    await openDemo();
    await userEvent.click(screen.getAllByRole("button", { name: "Habits" })[0]);
    await userEvent.click(
      await screen.findByRole("button", { name: "New habit" }),
    );
    let dialog = await screen.findByRole("dialog");
    const ending = within(dialog).getByRole("button", { name: /Ends/ });
    expect(ending.textContent).toContain("Never end");
    expect(within(dialog).queryByLabelText("End date")).toBe(null);
    expect(within(dialog).queryByText(/Past executions stay/)).toBe(null);
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "Evening walk",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create habit" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    const readHabit = () =>
      JSON.parse(localStorage.getItem("one-demo-v1")!).habits.find(
        (habit: { title: string }) => habit.title === "Evening walk",
      );
    expect(readHabit().endsOn).toBe(null);
    await userEvent.click(
      await screen.findByRole("button", { name: /^Evening walk/ }),
    );
    dialog = await screen.findByRole("dialog");
    await chooseOption(dialog, "Ends", "On a date");
    const start = readDate(dialog, "Starts on");
    const end =
      start.slice(0, 4) === "2026"
        ? "2027-12-31"
        : Number(start.slice(0, 4)) + 1 + "-12-31";
    await enterDate(dialog, "End date", end);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(readHabit().endsOn).toBe(end);
    await userEvent.click(
      screen.getByRole("button", { name: /^Evening walk/ }),
    );
    dialog = await screen.findByRole("dialog");
    expect(readDate(dialog, "End date")).toBe(end);
    await chooseOption(dialog, "Ends", "Never end");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(readHabit().endsOn).toBe(null);
  });
  it("saves and previews Markdown and round-trips typed database values", async () => {
    await openDemo();
    await userEvent.click(screen.getAllByRole("button", { name: "Notes" })[0]);
    await userEvent.click(
      await screen.findByRole("button", { name: "New note" }),
    );
    let dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "A small note",
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Note content" }),
      "# A real heading",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Preview" }),
    );
    expect(
      within(dialog).getByRole("heading", { name: "A real heading" }),
    ).toBeTruthy();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create note" }),
    );
    await screen.findByRole("heading", { name: "A small note" });
    await userEvent.click(screen.getByRole("button", { name: "Databases" }));
    await userEvent.click(screen.getByRole("button", { name: "New database" }));
    dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "Reading tracker",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Add a property" }),
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Property name" }),
      "Rating",
    );
    await chooseOption(dialog, "Type of Rating", "number");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Add a property" }),
    );
    await userEvent.type(
      within(dialog).getAllByRole("textbox", { name: "Property name" }).at(-1)!,
      "Finished on",
    );
    await chooseOption(dialog, "Type of Finished on", "date");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create database" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /Reading tracker/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "New record" }));
    dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "A good book",
    );
    await userEvent.type(
      within(dialog).getByRole("spinbutton", { name: "Rating" }),
      "4.5",
    );
    await enterDate(dialog, "Finished on", "2026-11-12");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Create record" }),
    );
    expect(await screen.findByText("4.5")).toBeTruthy();
    const savedRecord = JSON.parse(
      localStorage.getItem(DEMO_KEY)!,
    ).databaseRecords.find(
      (record: { title: string }) => record.title === "A good book",
    );
    expect(Object.values(savedRecord.values)).toContain("2026-11-12");
  });
});
