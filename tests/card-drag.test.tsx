// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useCardDrag } from "../src/lib/card-drag";
import type { Stage } from "../src/lib/actions";

const items = [
  { id: "a", title: "First step", stage: "todo" as Stage },
  { id: "b", title: "Second step", stage: "todo" as Stage },
];
function Board({ move }: { move: (...args: unknown[]) => Promise<unknown> }) {
  const sort = useCardDrag({
    items,
    stageOf: (i) => i.stage,
    lanes: ["todo", "hold"],
    board: true,
    disabled: false,
    onMove: move,
  });
  return (
    <>
      {sort.feedback}
      {(["todo", "hold"] as const).map((stage) => (
        <section aria-label={stage} key={stage} {...sort.lane(stage)}>
          {sort.items
            .filter((i) => sort.stageOf(i) === stage)
            .map((i) => (
              <article key={i.id} {...sort.card(i)}>
                <button className="one-card-open" aria-label={i.title} />
                <input aria-label={`Rename ${i.title}`} />
              </article>
            ))}
        </section>
      ))}
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("previews a keyboard move without writing, cancels it, and restores focus", async () => {
  const move = vi.fn(async () => {});
  render(<Board move={move} />);
  const open = screen.getByRole("button", { name: "First step" });
  fireEvent.keyDown(open, { key: " ", code: "Space" });
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(
    within(screen.getByRole("region", { name: "hold" })).getByRole("button", {
      name: "First step",
    }),
  ).toBeTruthy();
  expect(move).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(
    within(screen.getByRole("region", { name: "todo" })).getByRole("button", {
      name: "First step",
    }),
  ).toBeTruthy();
  await act(async () => {
    await new Promise(requestAnimationFrame);
  });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "First step" }),
  );
  expect(move).not.toHaveBeenCalled();
});

it("submits only on drop, keeps the preview pending, and rolls back a rejected API move", async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, fail) => {
    reject = fail;
  });
  const move = vi.fn(() => pending);
  render(<Board move={move} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Second step" }), {
    key: " ",
    code: "Space",
  });
  fireEvent.keyDown(window, { key: "ArrowUp" });
  expect(
    within(screen.getByRole("region", { name: "todo" }))
      .getAllByRole("button")[0]
      .getAttribute("aria-label"),
  ).toBe("Second step");
  expect(move).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "Enter" });
  expect(move).toHaveBeenCalledExactlyOnceWith(items[1], "todo", "a");
  expect(
    screen
      .getByRole("button", { name: "Second step" })
      .closest("article")
      ?.getAttribute("aria-busy"),
  ).toBe("true");
  await act(async () => {
    reject(new Error("Revision changed"));
  });
  expect(
    within(screen.getByRole("region", { name: "todo" }))
      .getAllByRole("button")[0]
      .getAttribute("aria-label"),
  ).toBe("First step");
  expect(screen.getByRole("status").textContent).toContain(
    "saved position was restored",
  );
});

it("does not start sorting from an editor or invoke the native drag image", () => {
  const move = vi.fn(async () => {});
  render(<Board move={move} />);
  fireEvent.keyDown(
    screen.getByRole("textbox", { name: "Rename First step" }),
    { key: " ", code: "Space" },
  );
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(
    within(screen.getByRole("region", { name: "hold" })).queryByRole("button"),
  ).toBeNull();
  expect(
    fireEvent.dragStart(
      screen.getByRole("button", { name: "First step" }).closest("article")!,
    ),
  ).toBe(false);
  expect(move).not.toHaveBeenCalled();
});

it("accepts a pointer drop in an animated layout gap and only suppresses the drag's trailing click", async () => {
  const move = vi.fn(async () => {});
  render(<Board move={move} />);
  const hold = screen.getByRole("region", { name: "hold" });
  vi.spyOn(hold, "getBoundingClientRect").mockReturnValue({
    left: 500,
    right: 900,
    top: 0,
    bottom: 400,
  } as DOMRect);
  const original = Object.getOwnPropertyDescriptor(
    document,
    "elementFromPoint",
  );
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => document.body,
  });
  const pointer = (type: string, target: Element | Window, x: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: 100,
    });
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      pointerType: { value: "mouse" },
    });
    fireEvent(target, event);
  };
  try {
    const button = screen.getByRole("button", { name: "First step" });
    pointer("pointerdown", button, 100);
    pointer("pointermove", window, 550);
    expect(move).not.toHaveBeenCalled();
    pointer("pointerup", window, 550);
    expect(move).toHaveBeenCalledExactlyOnceWith(items[0], "hold", null);
    expect(
      fireEvent.click(screen.getByRole("button", { name: "First step" }), {
        detail: 1,
      }),
    ).toBe(false);
    pointer(
      "pointerdown",
      screen.getByRole("textbox", { name: "Rename First step" }),
      550,
    );
    expect(
      fireEvent.click(screen.getByRole("button", { name: "First step" }), {
        detail: 1,
      }),
    ).toBe(true);
    await act(async () => {});
  } finally {
    if (original) Object.defineProperty(document, "elementFromPoint", original);
    else Reflect.deleteProperty(document, "elementFromPoint");
    vi.restoreAllMocks();
  }
});
