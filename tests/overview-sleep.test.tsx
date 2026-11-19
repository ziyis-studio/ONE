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
import OverviewSleepCard from "../src/components/OverviewSleepCard";
import SleepSummary from "../src/components/SleepSummary";
import { ChartTooltipScope } from "../src/components/ChartTooltip";
import { sleepByDay } from "../src/lib/sleep-history";
import { emptyWorkspace } from "../src/domain/model";
const mock = vi.hoisted(() => ({ context: null as unknown, edit: vi.fn() }));
vi.mock("../src/lib/workspace", () => ({ useOne: () => mock.context }));
const zone = "Asia/Kuala_Lumpur";
const records = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    startsAt: "2026-11-17T15:00:00Z",
    endsAt: "2026-11-17T22:00:00Z",
    awakeMinutes: 0,
    timeZone: zone,
    note: "",
    createdAt: "2026-11-18T00:00:00Z",
    updatedAt: "2026-11-18T00:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    startsAt: "2026-11-18T15:00:00Z",
    endsAt: "2026-11-18T23:00:00Z",
    awakeMinutes: 0,
    timeZone: zone,
    note: "",
    createdAt: "2026-11-19T00:00:00Z",
    updatedAt: "2026-11-19T00:00:00Z",
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  mock.context = {
    data: { ...emptyWorkspace(), sleepRecords: records },
    zone,
    today: "2026-11-19",
    edit: mock.edit,
    navigate: vi.fn(),
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("hover and keyboard focus update the sleep information without a popup, then restore the latest day", async () => {
  const { container } = render(
    <ChartTooltipScope>
      <OverviewSleepCard />
    </ChartTooltipScope>,
  );
  const readout = container.querySelector(".sleep-readout")!;
  expect(readout.getAttribute("data-sleep-day")).toBe("2026-11-19");
  const old = screen.getByRole("button", { name: /Wednesday, Nov 18 · 7h 0m/ });
  await userEvent.hover(old);
  expect(readout.getAttribute("data-sleep-day")).toBe("2026-11-18");
  expect(screen.queryByRole("tooltip")).toBeNull();
  await waitFor(() => expect(readout.textContent).toContain("7h 0m"));
  await userEvent.unhover(old);
  expect(readout.getAttribute("data-sleep-day")).toBe("2026-11-19");
  fireEvent.focus(old);
  expect(readout.getAttribute("data-sleep-day")).toBe("2026-11-18");
  fireEvent.blur(old);
  expect(readout.getAttribute("data-sleep-day")).toBe("2026-11-19");
  expect(old.hasAttribute("data-today")).toBe(false);
  expect(
    screen
      .getByRole("button", { name: /Thursday, Nov 19 · 8h 0m/ })
      .hasAttribute("data-today"),
  ).toBe(true);
});
test("missing overview days open a sleep log with the selected wake-up date", async () => {
  render(<OverviewSleepCard />);
  await userEvent.click(
    screen.getByRole("button", { name: /Tuesday, Nov 17 · No sleep logged/ }),
  );
  expect(mock.edit).toHaveBeenCalledWith({ kind: "sleep", date: "2026-11-17" });
});
test("three summary cards use logged-day averages and calendar coverage without inventing missing sleep", () => {
  const { container } = render(
    <SleepSummary
      history={sleepByDay(records, zone)}
      start="2026-10-21"
      end="2026-11-19"
      today="2026-11-19"
      label="Oct 21 – Nov 19"
    />,
  );
  expect(container.querySelectorAll(".sleep-stat-card")).toHaveLength(3);
  expect(container.querySelector(".sleep-stat-body strong")?.textContent).toBe(
    "7h 30m",
  );
  expect((screen.getByRole("progressbar") as HTMLProgressElement).value).toBe(
    2,
  );
  expect((screen.getByRole("progressbar") as HTMLProgressElement).max).toBe(30);
  expect(screen.getByRole("heading", { name: "Most recent" })).toBeTruthy();
});
