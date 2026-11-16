import type { MouseEvent } from "react";
import "./cards.css";
/** A native full-card target gives keyboard users the same surface action. */
export function CardOpen({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="one-card-open"
      aria-label={label}
      onClick={onOpen}
    />
  );
}
export function openCardBackground(
  event: MouseEvent<HTMLElement>,
  onOpen: () => void,
) {
  if (
    event.defaultPrevented ||
    (event.target instanceof Element &&
      event.target.closest(
        'button,a,input,select,textarea,[contenteditable="true"]',
      ))
  )
    return;
  onOpen();
}
