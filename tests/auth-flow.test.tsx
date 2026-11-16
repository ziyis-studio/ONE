// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import type { Session } from "@supabase/supabase-js";
import Auth from "../src/components/Auth";
import App from "../src/App";
import { emptyWorkspace } from "../src/domain/model";

const sdk = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  session: null as Session | null,
  change: null as null | ((event: string, session: unknown) => void),
}));
vi.mock("../src/lib/auth", () => ({
  signIn: sdk.signIn,
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof sdk.change) => {
        sdk.change = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: async () => ({ data: { session: sdk.session }, error: null }),
      signOut: async () => ({ error: null }),
      signUp: sdk.signUp,
      resetPasswordForEmail: sdk.resetPasswordForEmail,
      updateUser: sdk.updateUser,
    },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  sdk.session = null;
  location.hash = "/";
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(
        url.includes("open-meteo")
          ? { current: { temperature_2m: 28, weather_code: 2 } }
          : { data: emptyWorkspace() },
      ),
    ),
  );
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function showAuth(props: Partial<React.ComponentProps<typeof Auth>> = {}) {
  return render(
    <MotionConfig reducedMotion="always">
      <Auth onDemo={vi.fn()} {...props} />
    </MotionConfig>,
  );
}
async function passwordStep(value = "one-user") {
  await userEvent.type(
    await screen.findByLabelText("Email or username"),
    value,
  );
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  return screen.findByLabelText("Password");
}
function logo() {
  return document.querySelector(".auth-mark")!;
}

describe("ONE authentication feedback", () => {
  it("starts still, starts loading on deliberate focus and uses its own required-field feedback", async () => {
    showAuth();
    const input = screen.getByLabelText("Email or username");
    expect(document.activeElement).not.toBe(input);
    expect(logo().getAttribute("data-state")).toBe("idle");
    expect(input.closest("form")!.noValidate).toBe(true);
    await userEvent.click(input);
    expect(logo().getAttribute("data-state")).toBe("loading");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "Enter your email or username.",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(input);
    expect(sdk.signIn).not.toHaveBeenCalled();
    await userEvent.type(input, "one-user");
    expect(screen.queryByRole("alert")).toBe(null);
    expect(logo().getAttribute("data-state")).toBe("loading");
  });
  it("validates email and password locally, then keeps a failed request editable for retry", async () => {
    sdk.signIn.mockRejectedValue(
      Object.assign(new Error("Internal provider wording"), {
        code: "invalid_credentials",
      }),
    );
    showAuth();
    const input = screen.getByLabelText("Email or username");
    await userEvent.type(input, "person@");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "full email address",
    );
    await userEvent.clear(input);
    await userEvent.type(input, "person@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    const password = await screen.findByLabelText("Password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert").textContent).toBe("Enter your password.");
    expect(sdk.signIn).not.toHaveBeenCalled();
    await userEvent.type(password, "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Check your email or username and password",
    );
    expect(logo().getAttribute("data-state")).toBe("error");
    expect((password as HTMLInputElement).value).toBe("wrong-password");
    await userEvent.clear(password);
    expect(screen.queryByRole("alert")).toBe(null);
  });
  it("requires a valid signup email and a strong enough password, then waits for email confirmation", async () => {
    sdk.signUp.mockResolvedValue({
      data: { session: sdk.session },
      error: null,
    });
    const authenticated = vi.fn();
    showAuth({ onAuthenticated: authenticated });
    await userEvent.click(
      screen.getByRole("button", { name: "Create an account" }),
    );
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "username-only",
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "full email address",
    );
    await userEvent.clear(screen.getByLabelText("Email address"));
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "new@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    const password = await screen.findByLabelText("Password");
    await userEvent.type(password, "short");
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("at least 8");
    expect(sdk.signUp).not.toHaveBeenCalled();
    await userEvent.type(password, "-enough");
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Check your inbox." }),
    ).toBeTruthy();
    expect(authenticated).not.toHaveBeenCalled();
    expect(logo().getAttribute("data-state")).toBe("success");
    await userEvent.click(
      screen.getByRole("button", { name: "Back to sign in" }),
    );
    expect(screen.getByLabelText("Email or username")).toBeTruthy();
    expect(logo().getAttribute("data-state")).toBe("idle");
  });
  it("sends a reset link with persistent, private confirmation rather than navigating into the app", async () => {
    sdk.resetPasswordForEmail.mockResolvedValue({ error: null });
    const authenticated = vi.fn();
    showAuth({ onAuthenticated: authenticated });
    await passwordStep();
    await userEvent.click(
      screen.getByRole("button", { name: "Forgot password?" }),
    );
    await screen.findByLabelText("Email address");
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "full email address",
    );
    await userEvent.clear(screen.getByLabelText("Email address"));
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "reset@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Check your inbox." }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "If an account uses this email",
    );
    expect(sdk.resetPasswordForEmail).toHaveBeenCalledWith(
      "reset@example.com",
      { redirectTo: location.origin },
    );
    expect(authenticated).not.toHaveBeenCalled();
  });
  it("lets a recovery user request a fresh link when the current one has expired", async () => {
    sdk.updateUser.mockResolvedValue({ error: { code: "session_not_found" } });
    const recovered = vi.fn();
    showAuth({ recovery: true, onRecovered: recovered });
    await userEvent.type(
      screen.getByLabelText("New password"),
      "new-safe-password",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save new password" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "reset link has expired",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Request a new reset link" }),
    );
    expect(await screen.findByLabelText("Email address")).toBeTruthy();
    expect(recovered).not.toHaveBeenCalled();
  });
  it("deduplicates requests and cancels the success handoff when unmounted", async () => {
    let resolve!: () => void;
    sdk.signIn.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const authenticated = vi.fn();
    const view = showAuth({ onAuthenticated: authenticated });
    const password = await passwordStep();
    await userEvent.type(password, "correct-password");
    const form = password.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(sdk.signIn).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole("button", { name: "Signing in…" })
        .hasAttribute("disabled"),
    ).toBe(true);
    vi.useFakeTimers();
    await act(async () => resolve());
    expect(logo().getAttribute("data-state")).toBe("success");
    view.unmount();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(authenticated).not.toHaveBeenCalled();
  });
  it("opens a fresh recovery form when PASSWORD_RECOVERY arrives after login has mounted", async () => {
    render(
      <MotionConfig reducedMotion="always">
        <App />
      </MotionConfig>,
    );
    await screen.findByLabelText("Email or username");
    act(() =>
      sdk.change?.("PASSWORD_RECOVERY", {
        access_token: "recovery-token",
        user: { id: "test-user" },
      }),
    );
    expect(await screen.findByLabelText("New password")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "A fresh start." }),
    ).toBeTruthy();
    expect(logo().getAttribute("data-state")).toBe("idle");
  });
  it("retains the login screen after SIGNED_IN until the success feedback completes", async () => {
    const session = {
      access_token: "token",
      user: { id: "test-user" },
    } as Session;
    let resolve!: () => void;
    sdk.signIn.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(
      <MotionConfig reducedMotion="always">
        <App />
      </MotionConfig>,
    );
    const password = await passwordStep();
    await userEvent.type(password, "correct-password");
    fireEvent.submit(password.closest("form")!);
    sdk.session = session;
    act(() => sdk.change?.("SIGNED_IN", session));
    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeTruthy();
    expect(logo().getAttribute("data-state")).toBe("loading");
    await act(async () => resolve());
    expect(logo().getAttribute("data-state")).toBe("success");
    expect(screen.queryByRole("heading", { name: "Today." })).toBe(null);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Welcome back." })).toBe(
        null,
      ),
    );
    expect(await screen.findByRole("heading", { name: "Today." })).toBeTruthy();
    expect(location.hash).toBe("#/home");
  });
});
