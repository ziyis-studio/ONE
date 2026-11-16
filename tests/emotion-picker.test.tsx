// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmotionPicker from "../src/components/EmotionPicker";
afterEach(cleanup);
it("keeps an existing custom emotion and supports labelled keyboard selection", async () => {
  function Example() {
    const [value, setValue] = useState("Serene");
    return <EmotionPicker value={value} onChange={setValue} />;
  }
  render(<Example />);
  expect(
    (screen.getByRole("radio", { name: "Serene" }) as HTMLInputElement).checked,
  ).toBe(true);
  await userEvent.click(screen.getByRole("radio", { name: "Calm" }));
  await userEvent.keyboard("{ArrowRight}");
  expect(
    (screen.getByRole("radio", { name: "Excited" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  await userEvent.click(screen.getByRole("radio", { name: "Just a thought" }));
  expect(
    (screen.getByRole("radio", { name: "Just a thought" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
});
