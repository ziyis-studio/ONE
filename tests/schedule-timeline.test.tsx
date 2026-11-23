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

function nativeFixture(
  startsAt = "2026-03-09T13:00:00Z",
  endsAt = "2026-03-09T14:00:00Z",
  days = ["2026-03-09", "2026-03-10"],
) {
  const state = emptyWorkspace();
  const block = {
    id: "native",
    title: "Planning",
    description: "Keep links",
    startsAt,
    endsAt,
    timeZone: "America/New_York",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  };
  state.timeBlocks.push(block);
  context.data = state;
  let finish!: (error?: Error) => void;
  const onMove = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        finish = (error) => (error ? reject(error) : resolve());
      }),
  );
  render(
    <ScheduleTimeline
      days={days}
      week
      onDay={vi.fn()}
      onMove={onMove}
      onAttach={vi.fn()}
      onPlan={vi.fn()}
    />,
  );
  const tracks = days.map((day) => screen.getByTestId("schedule-track-" + day));
  for (const track of tracks)
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      bottom: 1440,
      right: 100,
      width: 100,
      height: 1440,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  const transfer = {
    types: ["text/one-block"],
    dropEffect: "",
    effectAllowed: "",
    setData: vi.fn(),
    getData: (type: string) => (type === "text/one-block" ? block.id : ""),
  };
  function start(index: number, top: number, grab: number) {
    const source = tracks[index].querySelector<HTMLElement>(
      "[data-block-id=native]",
    )!;
    vi.spyOn(source, "getBoundingClientRect").mockReturnValue({
      top,
      left: 0,
      bottom: top + 60,
      right: 100,
      width: 100,
      height: 60,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
    fireEvent.dragStart(source, {
      clientY: top + grab,
      dataTransfer: transfer,
    });
    return source;
  }
  return {
    block,
    state,
    tracks,
    transfer,
    start,
    onMove,
    finish: (error?: Error) => finish(error),
  };
}
it("previews block moves in the same and another day, retains the grab offset, and restores rejected moves", async () => {
  const f = nativeFixture(),
    before = JSON.stringify(f.state),
    source = f.start(0, 540, 20);
  fireEvent.dragEnter(f.tracks[0], { clientY: 650, dataTransfer: f.transfer });
  expect(
    screen.getByRole("img", { name: "Preview Planning: 10:30 – 11:30" }),
  ).toBeTruthy();
  expect(source.style.top).toBe("540px");
  expect(source.hasAttribute("data-native-source")).toBe(true);
  expect(f.onMove).not.toHaveBeenCalled();
  fireEvent.dragLeave(f.tracks[0], { relatedTarget: f.tracks[1] });
  fireEvent.dragOver(f.tracks[1], { clientY: 710, dataTransfer: f.transfer });
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(
    screen.getByRole("img", { name: "Preview Planning: 11:30 – 12:30" }),
  ).toBeTruthy();
  fireEvent.drop(f.tracks[1], { clientY: 710, dataTransfer: f.transfer });
  fireEvent.dragEnd(source, { dataTransfer: f.transfer });
  expect(f.onMove).toHaveBeenCalledExactlyOnceWith(
    f.block,
    "2026-03-10",
    690,
    undefined,
  );
  expect(
    screen.getByRole("img", { name: "Preview Planning: 11:30 – 12:30" }),
  ).toBeTruthy();
  expect(source.hasAttribute("data-native-source")).toBe(true);
  f.finish(new Error("Move rejected"));
  await waitFor(() => expect(screen.queryByRole("img")).toBeNull());
  expect(source.hasAttribute("data-native-source")).toBe(false);
  expect(notify).toHaveBeenCalledWith("Move rejected", true);
  expect(JSON.stringify(f.state)).toBe(before);
});
it("cancels cleanly, accounts for an overnight continuation and clips a native preview without shortening its saved duration", async () => {
  const f = nativeFixture("2026-03-09T03:30:00Z", "2026-03-09T05:00:00Z", [
    "2026-03-08",
    "2026-03-09",
    "2026-03-10",
  ]);
  f.start(1, 0, 30);
  fireEvent.dragOver(f.tracks[2], { clientY: 750, dataTransfer: f.transfer });
  expect(
    screen.getByRole("img", { name: "Preview Planning: 11:30 – 13:00" }),
  ).toBeTruthy();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("img")).toBeNull();
  expect(document.querySelector("[data-native-source]")).toBeNull();
  expect(f.onMove).not.toHaveBeenCalled();
  f.start(0, 1410, 0);
  fireEvent.dragOver(f.tracks[2], { clientY: 1438, dataTransfer: f.transfer });
  const preview = screen.getByRole("img", {
    name: "Preview Planning: 23:45 – 01:15 (+1 day)",
  });
  expect(preview.style.height).toBe("15px");
  fireEvent.drop(f.tracks[2], { clientY: 1438, dataTransfer: f.transfer });
  expect(f.onMove).toHaveBeenCalledExactlyOnceWith(
    f.block,
    "2026-03-10",
    1425,
    undefined,
  );
  f.finish();
  await waitFor(() => expect(screen.queryByRole("img")).toBeNull());
});
it("uses zoned end times across a DST change and blocks nonexistent native drop times", () => {
  const f = nativeFixture("2026-03-07T14:00:00Z", "2026-03-07T16:00:00Z", [
    "2026-03-07",
    "2026-03-08",
  ]);
  f.start(0, 540, 0);
  fireEvent.dragOver(f.tracks[1], { clientY: 90, dataTransfer: f.transfer });
  expect(
    screen.getByRole("img", { name: "Preview Planning: 01:30 – 04:30" }).style
      .height,
  ).toBe("180px");
  fireEvent.dragOver(f.tracks[1], { clientY: 150, dataTransfer: f.transfer });
  expect(screen.queryByRole("img")).toBeNull();
  expect(f.transfer.dropEffect).toBe("none");
  fireEvent.drop(f.tracks[1], { clientY: 150, dataTransfer: f.transfer });
  expect(f.onMove).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith(
    expect.stringMatching(/does not exist/),
    true,
  );
});
