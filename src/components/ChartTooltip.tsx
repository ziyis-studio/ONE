import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMotionPreference } from "../lib/motion-preference";
import "./chart-tooltip.css";
type Tip = {
  anchor: HTMLElement | SVGElement;
  title: string;
  detail: string;
  x: number;
  y: number;
  below: boolean;
};
/** One delegated tooltip serves every data mark, including large heatmaps. */
export function ChartTooltipScope({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const current = useRef<HTMLElement | SVGElement | null>(null);
  const id = useId();
  const reduced = useMotionPreference();
  function hide() {
    current.current = null;
    setTip(null);
  }
  function show(target: EventTarget | null) {
    const anchor =
      target instanceof Element
        ? target.closest<HTMLElement | SVGElement>("[data-chart-title]")
        : null;
    if (!anchor) {
      hide();
      return;
    }
    if (current.current === anchor) return;
    current.current = anchor;
    const rect = anchor.getBoundingClientRect();
    const below = rect.top < 80;
    setTip({
      anchor,
      title: anchor.dataset.chartTitle || "",
      detail: anchor.dataset.chartDetail || "",
      x: Math.max(116, Math.min(innerWidth - 116, rect.left + rect.width / 2)),
      y: below ? rect.bottom + 10 : rect.top - 10,
      below,
    });
  }
  useEffect(() => {
    if (!tip) return;
    const previous = tip.anchor.getAttribute("aria-describedby");
    tip.anchor.setAttribute(
      "aria-describedby",
      [previous, id].filter(Boolean).join(" "),
    );
    const observer = new MutationObserver(() =>
      setTip(
        (value) =>
          value && {
            ...value,
            title: value.anchor.dataset.chartTitle || "",
            detail: value.anchor.dataset.chartDetail || "",
          },
      ),
    );
    observer.observe(tip.anchor, {
      attributes: true,
      attributeFilter: ["data-chart-title", "data-chart-detail"],
    });
    const close = () => {
      current.current = null;
      setTip(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      observer.disconnect();
      if (previous) tip.anchor.setAttribute("aria-describedby", previous);
      else tip.anchor.removeAttribute("aria-describedby");
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [tip, id]);
  return (
    <div
      className="one-chart-scope"
      onPointerOver={(event) => {
        if (event.pointerType !== "touch") show(event.target);
      }}
      onPointerLeave={() => {
        if (current.current !== document.activeElement) hide();
      }}
      onFocusCapture={(event) => show(event.target)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && tip) {
          event.stopPropagation();
          event.preventDefault();
          hide();
        }
      }}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {tip && (
            <motion.div
              id={id}
              role="tooltip"
              className="one-chart-tooltip"
              key="chart-tooltip"
              style={{
                left: tip.x,
                top: tip.y,
                translateX: "-50%",
                translateY: tip.below ? "0" : "-100%",
              }}
              initial={{ opacity: 0, y: reduced ? 0 : 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.12 }}
            >
              <span>{tip.title}</span>
              <strong>{tip.detail}</strong>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
