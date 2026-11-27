import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/** Measure out of flow so a long document never collapses while the user types. */
export function useDocumentTextareaSize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled: boolean,
) {
  const resize = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!enabled || !area) return;
    const mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    mirror.tabIndex = -1;
    Object.assign(mirror.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      top: "0",
      left: "-10000px",
      height: "auto",
      minHeight: "0",
      maxHeight: "none",
      overflow: "hidden",
      resize: "none",
    });
    document.body.append(mirror);
    let width = -1;
    const measure = () => {
      width = area.clientWidth;
      const style = getComputedStyle(area);
      for (const key of [
        "width",
        "boxSizing",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "fontVariant",
        "lineHeight",
        "letterSpacing",
        "textIndent",
        "textTransform",
        "padding",
        "border",
        "tabSize",
        "wordBreak",
        "overflowWrap",
        "whiteSpace",
      ] as const)
        mirror.style[key] = style[key];
      // Preserve the empty final line just as a textarea does.
      mirror.textContent = `${area.value}\u200b`;
      const padding =
        (parseFloat(style.paddingTop) || 0) +
        (parseFloat(style.paddingBottom) || 0);
      const border =
        (parseFloat(style.borderTopWidth) || 0) +
        (parseFloat(style.borderBottomWidth) || 0);
      const height =
        mirror.scrollHeight +
        (style.boxSizing === "border-box" ? border : -padding);
      const next = `${Math.max(0, height)}px`;
      if (area.style.height !== next) area.style.height = next;
    };
    resize.current = measure;
    measure();
    const changedWidth = () => {
      if (area.clientWidth !== width) measure();
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            if (entries.some((entry) => entry.target === mirror)) measure();
            else changedWidth();
          });
    observer?.observe(area);
    // Font loading can change line wrapping without changing the editor width.
    observer?.observe(mirror);
    window.addEventListener("resize", changedWidth);
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      alive = false;
      resize.current = null;
      observer?.disconnect();
      window.removeEventListener("resize", changedWidth);
      document.fonts?.removeEventListener("loadingdone", measure);
      mirror.remove();
    };
  }, [enabled, ref]);
  useLayoutEffect(() => {
    resize.current?.();
  }, [value, enabled]);
}
