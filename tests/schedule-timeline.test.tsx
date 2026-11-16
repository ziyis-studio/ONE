// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
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
