// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppearanceSettings from "../src/components/AppearanceSettings";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  THEME_KEY,
  ThemeProvider,
  readAccent,
  readableAccent,
  whiteContrast,
} from "../src/lib/theme";

beforeEach(() => {
  localStorage.clear();
  document.head.innerHTML = '<link rel="icon" href="/favicon.svg">';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const appearance = () =>
  render(
    <ThemeProvider>
      <AppearanceSettings />
    </ThemeProvider>,
  );
describe("primary color preference", () => {
  it("applies and persists a preset, restores it after remount and resets to Violet", async () => {
    let view = appearance();
    await userEvent.click(screen.getByRole("radio", { name: "Blue" }));
    expect(
      document.documentElement.style.getPropertyValue("--one-accent"),
    ).toBe("#2563eb");
    expect(JSON.parse(localStorage.getItem(THEME_KEY)!)).toEqual({
      version: 1,
      color: "#2563eb",
    });
    expect(
      decodeURIComponent(
        document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,
      ),
    ).toContain('stroke="#eee"');
    const icon = new DOMParser().parseFromString(
      decodeURIComponent(
        document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,
      )
        .split(",")
        .slice(1)
        .join(","),
      "image/svg+xml",
    );
    expect(icon.querySelectorAll("path")[1].getAttribute("stroke")).toBe(
      document.documentElement.style.getPropertyValue("--one-accent-mark"),
    );
    view.unmount();
    view = appearance();
    expect(
      (screen.getByRole("radio", { name: "Blue" }) as HTMLInputElement).checked,
    ).toBe(true);
    await userEvent.click(
      screen.getByRole("button", { name: "Reset to Violet" }),
    );
    expect(readAccent()).toBe(DEFAULT_ACCENT);
  });
  it("validates custom HEX and readable white text without changing the saved color on error", async () => {
    appearance();
    const input = screen.getByRole("textbox", { name: /Custom color/ });
    await userEvent.clear(input);
    await userEvent.type(input, "bad");
    await userEvent.click(screen.getByRole("button", { name: "Apply color" }));
    expect(screen.getByRole("alert").textContent).toContain("HEX");
    await userEvent.clear(input);
    await userEvent.type(input, "#ffffff");
    await userEvent.click(screen.getByRole("button", { name: "Apply color" }));
    expect(screen.getByRole("alert").textContent).toContain("deeper shade");
    expect(readAccent()).toBe(DEFAULT_ACCENT);
    await userEvent.clear(input);
    await userEvent.type(input, "#893DA0{Enter}");
    expect(readAccent()).toBe("#893da0");
    expect(
      document.documentElement.style.getPropertyValue("--one-accent"),
    ).toBe("#893da0");
    expect(screen.queryByRole("alert")).toBe(null);
    expect(document.activeElement).toBe(input);
  });
  it("syncs another tab and safely ignores unsupported or corrupt preferences", () => {
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ version: 1, color: "#ffffff" }),
    );
    expect(readAccent()).toBe(DEFAULT_ACCENT);
    localStorage.setItem(THEME_KEY, "broken");
    expect(readAccent()).toBe(DEFAULT_ACCENT);
    appearance();
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ version: 1, color: "#0f766e" }),
    );
    fireEvent(window, new StorageEvent("storage", { key: THEME_KEY }));
    expect(
      (screen.getByRole("radio", { name: "Teal" }) as HTMLInputElement).checked,
    ).toBe(true);
    localStorage.clear();
    fireEvent(window, new StorageEvent("storage", { key: null }));
    expect(
      (screen.getByRole("radio", { name: "Violet" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
  it("keeps working for this visit when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    appearance();
    await userEvent.click(screen.getByRole("radio", { name: "Rose" }));
    expect(
      document.documentElement.style.getPropertyValue("--one-accent"),
    ).toBe("#be185d");
    expect(screen.getByRole("status").textContent).toContain("for this visit");
  });
  it("offers presets with white-label contrast and rejects CSS or non-color values", () => {
    for (const preset of ACCENT_PRESETS)
      expect(whiteContrast(preset.color)).toBeGreaterThanOrEqual(4.5);
    expect(readableAccent("#123")).toBe("#112233");
    for (const value of [
      "red",
      "#123456;display:none",
      "url(https://example.com)",
      "#abcdef",
      "#12",
    ])
      expect(readableAccent(value)).toBe(null);
  });
});
