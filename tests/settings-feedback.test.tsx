// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "../src/components/Settings";
import { ConfirmationProvider } from "../src/lib/confirmation";
import { ThemeProvider } from "../src/lib/theme";
import { emptyWorkspace } from "../src/domain/model";
const mock = vi.hoisted(() => ({ api: vi.fn(), notify: vi.fn() }));
vi.mock("../src/lib/api", () => ({ api: mock.api }));
vi.mock("../src/lib/auth", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));
vi.mock("../src/lib/workspace", () => ({
  useOne: () => ({
    data: emptyWorkspace(),
    zone: "Asia/Kuala_Lumpur",
    setZone: vi.fn(),
    session: {
      user: { id: "test-user", email: "sample@example.test" },
      access_token: "test-token",
    },
    demo: false,
    notify: mock.notify,
    reload: vi.fn(),
    today: "2026-11-17",
  }),
}));
beforeEach(() => {
  localStorage.clear();
  mock.api.mockReset();
  mock.notify.mockReset();
  mock.api.mockResolvedValue({ username: "existing" });
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function show() {
  render(
    <ThemeProvider>
      <ConfirmationProvider>
        <Settings onExit={vi.fn()} />
      </ConfirmationProvider>
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "Username" }) as HTMLInputElement)
        .value,
    ).toBe("existing"),
  );
  return screen.getByRole("textbox", { name: "Username" });
}
describe("settings username feedback", () => {
  it("shows inline required/format errors and only sends a normalized valid username", async () => {
    const input = await show();
    await userEvent.clear(input);
    await userEvent.click(
      screen.getByRole("button", { name: "Save username" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("Enter a username");
    expect(document.activeElement).toBe(input);
    await userEvent.type(input, "bad name");
    await userEvent.click(
      screen.getByRole("button", { name: "Save username" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("3–32");
    expect(mock.api).toHaveBeenCalledTimes(1);
    await userEvent.clear(input);
    await userEvent.type(input, "New.Name");
    await userEvent.click(
      screen.getByRole("button", { name: "Save username" }),
    );
    await waitFor(() =>
      expect(mock.notify).toHaveBeenCalledWith("Your username is saved."),
    );
    expect(mock.api).toHaveBeenLastCalledWith("/v1/profile", "test-token", {
      method: "PATCH",
      body: JSON.stringify({ username: "new.name" }),
    });
    expect((input as HTMLInputElement).value).toBe("new.name");
    expect(input.closest("form")?.noValidate).toBe(true);
  });
  it("deduplicates a pending save and preserves the input when the server rejects it", async () => {
    const input = await show();
    let reject!: (cause: Error) => void;
    mock.api.mockImplementationOnce(
      () =>
        new Promise((_, failed) => {
          reject = failed;
        }),
    );
    await userEvent.clear(input);
    await userEvent.type(input, "already.used");
    await userEvent.dblClick(
      screen.getByRole("button", { name: "Save username" }),
    );
    expect(mock.api).toHaveBeenCalledTimes(2);
    reject(new Error("This username is already in use."));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "already in use",
    );
    expect((input as HTMLInputElement).value).toBe("already.used");
  });
});
