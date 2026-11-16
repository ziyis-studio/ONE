// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import WorkspaceLoading from "../src/components/WorkspaceLoading";
vi.mock("../src/lib/workspace", () => ({
  useOne: () => ({ today: "2026-11-16" }),
}));
afterEach(cleanup);
describe("page-specific pending content", () => {
  it("uses the sleep summary and history structure instead of dashboard cards", () => {
    const { container, rerender } = render(<WorkspaceLoading page="sleep" />);
    expect(screen.getByRole("status", { name: "Loading sleep" })).toBeTruthy();
    expect(container.querySelector(".one-loading-summary")).toBeTruthy();
    expect(container.querySelector(".one-loading-heatmap")).toBeTruthy();
    expect(container.querySelector(".dashboard-grid")).toBe(null);
    expect(screen.queryByRole("heading")).toBe(null);
    expect(screen.queryByRole("button")).toBe(null);
    rerender(<WorkspaceLoading page="schedule" />);
    expect(
      screen.getByRole("status", { name: "Loading schedule" }),
    ).toBeTruthy();
    expect(container.querySelectorAll(".month-week").length).toBe(6);
    expect(container.querySelectorAll(".month-cell").length).toBe(42);
    expect(container.querySelector(".one-loading-task-panel")).toBeTruthy();
  });
  it("shares each route's responsive layout and keeps decorative content out of keyboard navigation", () => {
    const { container, rerender } = render(<WorkspaceLoading page="home" />);
    expect(
      container.querySelector(".dashboard-grid > .clock-card"),
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll(".dashboard-grid > .card")]
        .slice(0, 4)
        .map((card) =>
          ["clock-card", "pomodoro-card", "sleep-card", "habits-card"].find(
            (name) => card.classList.contains(name),
          ),
        ),
    ).toEqual(["clock-card", "pomodoro-card", "sleep-card", "habits-card"]);
    rerender(<WorkspaceLoading page="tasks" />);
    expect(container.querySelector(".board-scroll > .task-board")).toBeTruthy();
    rerender(<WorkspaceLoading page="projects" />);
    expect(container.querySelector(".project-board")).toBeTruthy();
    rerender(<WorkspaceLoading page="thoughts" />);
    expect(
      container.querySelector(".thought-layout > .thought-timeline"),
    ).toBeTruthy();
    rerender(<WorkspaceLoading page="notes" />);
    expect(container.querySelector(".notes-grid")).toBeTruthy();
    rerender(<WorkspaceLoading page="habits" />);
    expect(container.querySelector(".one-loading-habit-map")).toBeTruthy();
    rerender(<WorkspaceLoading page="settings" />);
    expect(container.querySelector(".one-loading-settings")).toBeTruthy();
    expect(
      container.querySelector("button,input,select,textarea,[tabindex]"),
    ).toBe(null);
  });
});
