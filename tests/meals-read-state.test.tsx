// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyWorkspace } from "../src/domain/model";
import { mealDay } from "./support/meals";
import Meals from "../src/components/Meals";
const mocks = vi.hoisted(() => ({ api: vi.fn(), context: null as unknown }));
vi.mock("../src/lib/api", () => ({
  api: mocks.api,
  accessToken: async () => "fixture",
  downloadAttachment: vi.fn(),
}));
vi.mock("../src/lib/workspace", () => ({ useOne: () => mocks.context }));
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mocks.api.mockReset();
  mocks.context = {
    data: emptyWorkspace(),
    demo: false,
    zone: "Asia/Kuala_Lumpur",
    today: "2026-11-20",
    edit: vi.fn(),
    reload: vi.fn(),
    busy: false,
    notify: vi.fn(),
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("failed account reads show unavailable totals instead of a false empty day, then recover on retry", async () => {
  mocks.api.mockRejectedValueOnce(new Error("Invalid request."));
  render(<Meals />);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Invalid request.");
  expect(screen.queryByText("0 meals")).toBeNull();
  expect(screen.queryByText("0 entries")).toBeNull();
  expect(screen.queryByText("A little room for your next meal")).toBeNull();
  expect(screen.getByText("Daily summary unavailable.")).toBeTruthy();
  mocks.api.mockResolvedValue(
    mealDay(emptyWorkspace(), {
      date: "2026-11-20",
      zone: "Asia/Kuala_Lumpur",
    }),
  );
  await userEvent.click(
    within(alert).getByRole("button", { name: "Try again" }),
  );
  expect(
    await screen.findByText("A little room for your next meal"),
  ).toBeTruthy();
  expect(screen.getByText("0 meals")).toBeTruthy();
  expect(mocks.api.mock.calls[0][0]).toContain(
    "/v1/meals?date=2026-11-20&zone=Asia%2FKuala_Lumpur",
  );
});
test("compact date controls retain an accessible date label and navigate the authenticated request", async () => {
  mocks.api.mockImplementation(async (path: string) => {
    const url = new URL(path, "https://api.example");
    return mealDay(emptyWorkspace(), {
      date: url.searchParams.get("date")!,
      zone: "Asia/Kuala_Lumpur",
    });
  });
  render(<Meals />);
  await screen.findByText("0 meals");
  const navigation = screen.getByRole("group", { name: "Meal day navigation" });
  expect(
    within(navigation).getByRole("button", { name: /Choose meal date/ }),
  ).toBeTruthy();
  expect(navigation.querySelector(".one-date-label-hidden")?.textContent).toBe(
    "Meal date",
  );
  await userEvent.click(
    within(navigation).getByRole("button", { name: "Previous meal day" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Thursday, Nov 19" }),
  ).toBeTruthy();
  expect(mocks.api.mock.calls.at(-1)![0]).toContain("date=2026-11-19");
});
