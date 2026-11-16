import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export function dateField(scope: HTMLElement, name: string) {
  return within(scope).getByRole("group", { name });
}
export function readDate(scope: HTMLElement, name: string, withTime = false) {
  const group = dateField(scope, name);
  const part = (name: string) =>
    within(group)
      .getByRole("spinbutton", { name: new RegExp(name, "i") })
      .getAttribute("aria-valuenow")!
      .padStart(name === "year" ? 4 : 2, "0");
  return `${part("year")}-${part("month")}-${part("day")}${withTime ? `T${part("hour")}:${part("minute")}` : ""}`;
}
export async function enterDate(
  scope: HTMLElement,
  name: string,
  value: string,
) {
  const group = dateField(scope, name);
  for (const [part, digits] of [
    ["year", value.slice(0, 4)],
    ["month", value.slice(5, 7)],
    ["day", value.slice(8, 10)],
  ]) {
    await userEvent.click(
      within(group).getByRole("spinbutton", { name: new RegExp(part, "i") }),
    );
    await userEvent.keyboard(digits);
  }
}
