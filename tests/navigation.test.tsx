// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import Navigation, {
  useSidebar,
  SidebarToggle,
} from "../src/components/Navigation";
import type { Page } from "../src/lib/workspace";
let mobile = false;
let resize: (() => void) | undefined;
beforeEach(() => {
  localStorage.clear();
  mobile = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("max-width") && mobile;
    },
    addEventListener: (_: string, cb: () => void) => {
      if (query.includes("max-width")) resize = cb;
    },
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function Example() {
  const [expanded, setExpanded] = useSidebar();
  const [page, setPage] = useState<Page>("home");
  return (
    <MotionConfig reducedMotion="always">
      <SidebarToggle
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      <Navigation
        page={page}
        navigate={setPage}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
        initial="Y"
        demo
        onExit={vi.fn()}
      />
      <main id="main-content" tabIndex={-1}>
        <h1>{page}</h1>
        <input aria-label="Draft" />
      </main>
    </MotionConfig>
  );
}
describe("ONE navigation", () => {
  it("persists explicit expansion, switches pages, and keeps keyboard shortcuts out of editors", async () => {
    const { unmount } = render(<Example />);
    await userEvent.click(
      screen.getByRole("button", { name: "Expand sidebar" }),
    );
    expect(localStorage.getItem("one-sidebar-expanded-v1")).toBe("true");
    const sidebar = screen.getByRole("navigation", { name: "Your workspace" });
    await userEvent.click(
      within(sidebar).getByRole("button", { name: "Sleep" }),
    );
    expect(
      within(sidebar)
        .getByRole("button", { name: "Sleep" })
        .getAttribute("aria-current"),
    ).toBe("page");
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(
      screen
        .getByRole("button", { name: "Expand sidebar" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    const draft = screen.getByRole("textbox", { name: "Draft" });
    fireEvent.keyDown(draft, { key: "b", ctrlKey: true });
    expect(localStorage.getItem("one-sidebar-expanded-v1")).toBe("false");
    await userEvent.click(
      screen.getByRole("button", { name: "Expand sidebar" }),
    );
    unmount();
    render(<Example />);
    expect(
      screen
        .getByRole("button", { name: "Collapse sidebar" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });
  it("expands mobile destinations, contains focus, dismisses with Escape, and navigates", async () => {
    mobile = true;
    render(<Example />);
    await userEvent.click(
      screen.getByRole("button", { name: "More destinations" }),
    );
    let tray = screen.getByRole("dialog", { name: "More destinations" });
    expect(within(tray).getByRole("button", { name: "Projects" })).toBe(
      document.activeElement,
    );
    await userEvent.click(
      within(tray).getByRole("button", {
        name: "Close more destinations",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "More destinations" }),
    );
    await userEvent.keyboard("{Escape}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "More destinations" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "More destinations" }),
    );
    tray = screen.getByRole("dialog", { name: "More destinations" });
    await userEvent.click(within(tray).getByRole("button", { name: "Habits" }));
    expect(screen.getByRole("heading").textContent).toBe("habits");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });
  it("closes the mobile tray on desktop resize without changing the saved sidebar preference", async () => {
    mobile = true;
    render(<Example />);
    await userEvent.click(
      screen.getByRole("button", { name: "More destinations" }),
    );
    mobile = false;
    fireEvent(window, new Event("resize"));
    act(() => resize?.());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(localStorage.getItem("one-sidebar-expanded-v1")).toBe("false");
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });
});
