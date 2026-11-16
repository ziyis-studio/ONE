import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
export async function chooseOption(
  scope: HTMLElement,
  label: string,
  option: string,
) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await userEvent.click(
    within(scope).getByRole("button", { name: new RegExp(escaped) }),
  );
  const list = await screen.findByRole("listbox");
  await userEvent.click(within(list).getByRole("option", { name: option }));
  await waitFor(() => {
    if (screen.queryByRole("listbox")) throw new Error("Menu still open");
  });
}
