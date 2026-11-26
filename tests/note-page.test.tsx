// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
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
  history.replaceState(null, "", "#/home");
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        current: {
          temperature_2m: 28,
          weather_code: 2,
          time: "2026-11-26T12:00",
        },
      }),
    ),
  );
  window.scrollTo = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  localStorage.setItem(
    DEMO_KEY,
    JSON.stringify(createDemo("Asia/Kuala_Lumpur")),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const snapshot = () => JSON.parse(localStorage.getItem(DEMO_KEY)!);
async function start() {
  const result = render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Explore ONE" }),
  );
  return result;
}
const page = () => screen.getByRole("region", { name: "Note editor" });
describe("Immersive notes", () => {
  it("returns from a linked note to its project with the project draft intact", async () => {
    const state = snapshot(),
      project = state.projects[0],
      note = state.notes[0];
    state.noteLinks.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      noteId: note.id,
      targetNoteId: null,
      taskId: null,
      projectId: project.id,
      thoughtId: null,
    });
    localStorage.setItem(DEMO_KEY, JSON.stringify(state));
    await start();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Projects" })[0],
    );
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Open project " + project.title,
      }),
    );
    const dialog = await screen.findByRole("dialog", { name: "EDIT PROJECT" });
    await userEvent.clear(
      within(dialog).getByRole("textbox", { name: "Title" }),
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Title" }),
      "A retained project draft",
    );
    await userEvent.click(within(dialog).getByRole("tab", { name: /^Notes/ }));
    await userEvent.click(
      within(dialog).getByRole("button", { name: new RegExp("^" + note.title) }),
    );
    await screen.findByRole("region", { name: "Note editor" });
    await userEvent.click(
      screen.getByRole("button", { name: "Back to project" }),
    );
    const returned = await screen.findByRole("dialog", {
      name: "EDIT PROJECT",
    });
    expect(
      (
        within(returned).getByRole("textbox", {
          name: "Title",
        }) as HTMLInputElement
      ).value,
    ).toBe("A retained project draft");
  });
  it("creates a routed page, keeps writing after save, and recovers later drafts after another visit", async () => {
    await start();
    await userEvent.click(screen.getAllByRole("button", { name: "Notes" })[0]);
    await userEvent.click(
      await screen.findByRole("button", { name: "New note" }),
    );
    await screen.findByRole("region", { name: "Note editor" });
    expect(location.hash).toBe("#/notes/new");
    expect(screen.queryByRole("dialog")).toBe(null);
    const title = within(page()).getByRole("textbox", { name: "Title" }),
      content = within(page()).getByRole("textbox", { name: "Note content" });
    const tags = within(page()).getByRole("button", { name: "Choose tags" });
    expect(
      tags.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await userEvent.type(title, "A new writing space");
    await userEvent.type(content, "# First idea");
    await userEvent.click(
      within(page()).getByRole("button", { name: "Create note" }),
    );
    await waitFor(() =>
      expect(
        snapshot().notes.some(
          (n: { title: string }) => n.title === "A new writing space",
        ),
      ).toBe(true),
    );
    await screen.findByRole("button", { name: "Save changes" });
    const note = snapshot().notes.find(
      (n: { title: string }) => n.title === "A new writing space",
    );
    expect(location.hash).toBe("#/notes/" + note.id);
    expect(screen.queryByRole("dialog")).toBe(null);
    await userEvent.type(
      within(page()).getByRole("textbox", { name: "Note content" }),
      "\nA draft after saving",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Back to notes" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Open A new writing space" }),
    );
    await waitFor(() =>
      expect(
        (
          within(page()).getByRole("textbox", {
            name: "Note content",
          }) as HTMLTextAreaElement
        ).value,
      ).toContain("A draft after saving"),
    );
    await userEvent.click(
      within(page()).getByRole("button", { name: "Focus mode" }),
    );
    expect(page().getAttribute("data-focus-mode")).toBe("true");
    await userEvent.click(
      within(page()).getByRole("button", { name: "Exit focus mode" }),
    );
    await userEvent.click(
      within(page()).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() =>
      expect(
        snapshot().notes.find((n: { id: string }) => n.id === note.id).content,
      ).toContain("A draft after saving"),
    );
    expect(page()).toBeTruthy();
  });
  it("opens a note from its URL after entering the workspace and preserves links and tags on save", async () => {
    const state = snapshot(),
      note = state.notes[0];
    note.tags = ["research"];
    state.noteLinks.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      noteId: note.id,
      targetNoteId: null,
      taskId: state.tasks[0].id,
      projectId: null,
      thoughtId: null,
    });
    localStorage.setItem(DEMO_KEY, JSON.stringify(state));
    history.replaceState(null, "", "#/notes/" + note.id);
    const result = await start();
    await screen.findByRole("region", { name: "Note editor" });
    expect(
      (
        within(page()).getByRole("textbox", {
          name: "Title",
        }) as HTMLInputElement
      ).value,
    ).toBe(note.title);
    await userEvent.type(
      within(page()).getByRole("textbox", { name: "Note content" }),
      "\nAnother paragraph",
    );
    await userEvent.click(
      within(page()).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() =>
      expect(
        snapshot().notes.find((n: { id: string }) => n.id === note.id).content,
      ).toContain("Another paragraph"),
    );
    expect(snapshot().noteLinks).toEqual(state.noteLinks);
    expect(
      snapshot().notes.find((n: { id: string }) => n.id === note.id).tags,
    ).toEqual(["research"]);
    result.unmount();
    await start();
    await screen.findByRole("region", { name: "Note editor" });
    expect(location.hash).toBe("#/notes/" + note.id);
    expect(
      (
        within(page()).getByRole("textbox", {
          name: "Note content",
        }) as HTMLTextAreaElement
      ).value,
    ).toContain("Another paragraph");
  });
  it("shows an unavailable page for a deleted or unknown note rather than editing a new item", async () => {
    history.replaceState(
      null,
      "",
      "#/notes/10000000-0000-4000-8000-000000000001",
    );
    await start();
    await screen.findByRole("heading", { name: "This note is unavailable." });
    expect(screen.queryByRole("region", { name: "Note editor" })).toBe(null);
    await userEvent.click(
      screen.getByRole("button", { name: "Back to notes" }),
    );
    await screen.findByRole("heading", { name: "Notes." });
    expect(location.hash).toBe("#/notes");
  });
});
