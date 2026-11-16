import { useLayoutEffect, useRef } from "react";
import { useMotionPreference } from "./motion-preference";
import "../components/popup-exit.css";
type Kind = "dialog" | "confirmation" | "date" | "select";
let generation = 0;
const copies = new Map<HTMLElement, () => void>();
function opening() {
  generation++;
  for (const remove of [...copies.values()]) remove();
}

/** The live popup leaves immediately; only a non-interactive visual can linger. */
export function capturePopupExit(source: HTMLElement, kind: Kind) {
  const box = source.getBoundingClientRect();
  if (
    !source.isConnected ||
    box.width <= 0 ||
    box.height <= 0 ||
    getComputedStyle(source).visibility === "hidden"
  )
    return;
  const version = generation,
    clone = source.cloneNode(true) as HTMLElement;
  const wrapper = document.createElement("div");
  wrapper.className = "one-shell one-popup-exit";
  wrapper.dataset.exitKind = kind;
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.inert = true;
  Object.assign(wrapper.style, {
    position: "fixed",
    left: box.left + "px",
    top: box.top + "px",
    width: box.width + "px",
    height: box.height + "px",
    zIndex: kind === "confirmation" ? "260" : kind === "dialog" ? "180" : "200",
  });
  wrapper.style.setProperty(
    "--one-exit-opacity",
    getComputedStyle(source).opacity,
  );
  const originals = [source, ...source.querySelectorAll<HTMLElement>("*")],
    nodes = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  const scrolls: { node: HTMLElement; top: number; left: number }[] = [];
  nodes.forEach((node, index) => {
    for (const attribute of [
      "id",
      "role",
      "aria-modal",
      "data-one-dialog",
      "data-one-dialog-owner",
      "data-one-confirm",
      "autofocus",
      "data-entering",
      "data-exiting",
    ])
      node.removeAttribute(attribute);
    if (node instanceof HTMLElement) {
      node.style.animation = "none";
      node.style.transition = "none";
      node.tabIndex = -1;
    }
    const original = originals[index];
    if (
      node instanceof HTMLElement &&
      original instanceof HTMLElement &&
      (original.scrollTop || original.scrollLeft)
    )
      scrolls.push({
        node,
        top: original.scrollTop,
        left: original.scrollLeft,
      });
    if (
      node instanceof HTMLInputElement &&
      original instanceof HTMLInputElement
    ) {
      node.value = original.value;
      node.checked = original.checked;
    }
    if (
      node instanceof HTMLTextAreaElement &&
      original instanceof HTMLTextAreaElement
    )
      node.value = original.value;
  });
  Object.assign(clone.style, {
    position: "relative",
    inset: "auto",
    left: "0",
    top: "0",
    margin: "0",
    width: "100%",
    height: "100%",
    transform: "none",
  });
  if (kind === "dialog" || kind === "confirmation") {
    const surface = clone.querySelector<HTMLElement>(".dialog,.one-confirm"),
      original = source.querySelector<HTMLElement>(".dialog,.one-confirm");
    if (surface && original) {
      surface.style.setProperty(
        "--one-exit-transform",
        getComputedStyle(original).transform,
      );
      surface.style.animation = "one-surface-exit 160ms ease-in both";
    }
  } else {
    clone.style.animation = "one-popover-exit 160ms ease-in both";
  }
  wrapper.appendChild(clone);
  // StrictMode's simulated unmount leaves the source connected. A fresh popup
  // also cancels an obsolete visual before it can cover its replacement.
  queueMicrotask(() => {
    if (
      source.isConnected ||
      version !== generation ||
      !document.body.isConnected
    )
      return;
    const remove = () => {
      clearTimeout(timer);
      copies.delete(wrapper);
      wrapper.remove();
    };
    const timer = setTimeout(remove, 240);
    copies.set(wrapper, remove);
    wrapper.addEventListener("animationend", (event) => {
      if (event.target === wrapper) remove();
    });
    document.body.appendChild(wrapper);
    for (const { node, top, left } of scrolls) {
      node.scrollTop = top;
      node.scrollLeft = left;
    }
  });
}
export function usePopupExit(
  ref: { readonly current: HTMLElement | null },
  kind: Kind,
) {
  const reduced = useMotionPreference(),
    reduce = useRef(reduced);
  reduce.current = reduced;
  useLayoutEffect(() => {
    opening();
    return () => {
      if (!reduce.current && ref.current) capturePopupExit(ref.current, kind);
    };
  }, [ref, kind]);
}
/** Mounted only inside an open React Aria popover, outside its collection. */
export function PopoverExit({ kind }: { kind: "date" | "select" }) {
  const marker = useRef<HTMLSpanElement>(null),
    reduced = useMotionPreference(),
    reduce = useRef(reduced);
  reduce.current = reduced;
  useLayoutEffect(() => {
    const popup = marker.current?.closest<HTMLElement>(
      kind === "date" ? ".one-date-popover" : ".one-select-popover",
    );
    if (!popup) return;
    opening();
    return () => {
      if (!reduce.current) capturePopupExit(popup, kind);
    };
  }, [kind]);
  return <span hidden aria-hidden="true" ref={marker} />;
}
