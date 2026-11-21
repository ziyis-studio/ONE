// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import ScheduleTimeline from "../src/components/ScheduleTimeline";
import { emptyWorkspace } from "../src/domain/model";
const { edit, notify, context } = vi.hoisted(() => ({
  edit: vi.fn(),
  notify: vi.fn(),
  context: {} as Record<string, unknown>,
}));
vi.mock("../src/lib/workspace", () => ({ useOne: () => context }));
beforeEach(() => {
  Object.assign(context, {
    data: emptyWorkspace(),
    zone: "America/New_York",
    today: "2026-03-08",
    busy: false,
    edit,
    notify,
  });
  edit.mockReset();
  notify.mockReset();
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => true);
  Element.prototype.releasePointerCapture = vi.fn();
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId || 1;
    }
  }
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  vi.stubGlobal("DragEvent", window.MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("previews a civil time and reports a DST gap without crashing or saving", () => {
  render(
    <ScheduleTimeline
      days={["2026-03-08"]}
      week={false}
      onDay={vi.fn()}
      onMove={vi.fn()}
      onAttach={vi.fn()}
      onPlan={vi.fn()}
    />,
  );
  const track = screen.getByTestId("schedule-track");
  vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
    top: 0,
    left: 0,
    bottom: 1440,
    right: 600,
    height: 1440,
    width: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientY: 150 });
  expect(screen.getByText(/02:30/)).toBeTruthy();
  fireEvent.pointerMove(track, { pointerId: 1, clientY: 180 });
  fireEvent.pointerUp(track, { pointerId: 1, clientY: 180 });
  expect(edit).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith(expect.any(String), true);
});

it("previews task drops across week tracks, clips at midnight, and clears on cancellation or attachment", async () => {
  const state = emptyWorkspace();
  const block = {
    id: "existing",
    title: "Existing",
    description: "",
    startsAt: "2026-03-09T14:00:00Z",
    endsAt: "2026-03-09T15:00:00Z",
    timeZone: "America/New_York",
    createdAt: "2026-03-09T00:00:00Z",
    updatedAt: "2026-03-09T00:00:00Z",
  };
  state.timeBlocks.push(block);
  context.data = state;
  const onPlan = vi.fn(() => Promise.resolve()),
    onAttach = vi.fn(() => Promise.resolve());
  render(
    <ScheduleTimeline
      days={["2026-03-09", "2026-03-10"]}
      week
      onDay={vi.fn()}
      onMove={vi.fn()}
      onAttach={onAttach}
      onPlan={onPlan}
      draggedTaskTitle="Voucher"
    />,
  );
  const first = screen.getByTestId("schedule-track-2026-03-09"),
    second = screen.getByTestId("schedule-track-2026-03-10");
  for (const track of [first, second])
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      bottom: 1440,
      right: 100,
      height: 1440,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  const transfer = {
    types: ["text/one-task"],
    dropEffect: "",
    getData: () => "task",
  };
  fireEvent.dragEnter(first, { dataTransfer: transfer, clientY: 618 });
  expect(
    screen.getByRole("img", { name: "Preview Voucher: 10:15 – 10:45" }),
  ).toBeTruthy();
  expect(onPlan).not.toHaveBeenCalled();
  fireEvent.dragLeave(first, { relatedTarget: second });
  fireEvent.dragOver(second, { dataTransfer: transfer, clientY: 1440 });
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(
    screen.getByRole("img", { name: "Preview Voucher: 23:45 – 24:00" }).style
      .height,
  ).toBe("15px");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("img")).toBeNull();
  fireEvent.dragOver(first, { dataTransfer: transfer, clientY: 618 });
  const target = first.querySelector<HTMLElement>("[data-block-id=existing]")!;
  fireEvent.dragEnter(target, { dataTransfer: transfer });
  expect(screen.queryByRole("img")).toBeNull();
  expect(target.hasAttribute("data-task-over")).toBe(true);
  fireEvent.dragEnd(window);
  expect(target.hasAttribute("data-task-over")).toBe(false);
  fireEvent.dragOver(second, { dataTransfer: transfer, clientY: 1440 });
  fireEvent.drop(second, { dataTransfer: transfer, clientY: 1440 });
  expect(onPlan).toHaveBeenCalledExactlyOnceWith("task", "2026-03-10", 1425);
  await waitFor(() =>
    expect(second.querySelector(".schedule-create-preview")).toBeNull(),
  );
  expect(onAttach).not.toHaveBeenCalled();
});
