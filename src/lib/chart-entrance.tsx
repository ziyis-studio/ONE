import { useLayoutEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { useMotionPreference } from "./motion-preference";
import "../components/chart-entrance.css";

type Options = { ready?: boolean; replayKey?: string };
const unseen = Symbol("unseen");
const easing = "cubic-bezier(.22,.61,.36,1)";

/** Decorative entrance only: layout, data values and hit areas stay authoritative. */
export function useChartEntrance<T extends HTMLElement | SVGSVGElement>({
  ready = true,
  replayKey = "entry",
}: Options = {}) {
  const root = useRef<T | null>(null);
  const played = useRef<string | symbol>(unseen);
  const reduced = useMotionPreference();
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    node.setAttribute("data-chart-motion-root", "");
    const active = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    let disposed = false;
    function settle() {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      for (const animation of active) animation.cancel();
      active.clear();
      node!.setAttribute("data-chart-motion", reduced ? "static" : "ready");
    }
    function animate(
      element: Element,
      frames: Keyframe[],
      duration: number,
      delay = 0,
    ) {
      const animation = element.animate(frames, {
        duration,
        delay,
        easing,
        fill: "both",
      });
      active.add(animation);
      animation.addEventListener(
        "finish",
        () => {
          active.delete(animation);
          // Remove the fill so later data/hover updates never stick on an old value.
          animation.cancel();
          if (!active.size) node!.setAttribute("data-chart-motion", "ready");
        },
        { once: true },
      );
    }
    function enter() {
      if (disposed) return;
      observer?.disconnect();
      if (played.current === replayKey) return;
      played.current = replayKey;
      if (
        node!.closest("[inert]") ||
        document.body.classList.contains("one-card-drag-active")
      ) {
        node!.setAttribute("data-chart-motion", "ready");
        return;
      }
      node!.setAttribute("data-chart-motion", "playing");
      animate(node!, [{ opacity: 0.55 }, { opacity: 1 }], 360);
      const marks = [
        ...node!.querySelectorAll<HTMLElement | SVGElement>(
          "[data-chart-enter]",
        ),
      ].filter((mark) => mark.closest("[data-chart-motion-root]") === node);
      const cells = marks.filter((mark) => mark.dataset.chartEnter === "cell");
      const fades = marks.filter((mark) => mark.dataset.chartEnter === "fade");
      let seriesIndex = 0;
      for (const mark of marks) {
        const kind = mark.dataset.chartEnter;
        if (kind === "cell") {
          // Dense yearly maps fade as one surface, rather than allocating hundreds
          // of concurrent animations. Smaller maps reveal their cells in a wave.
          if (cells.length <= 80)
            animate(
              mark,
              [{ opacity: 0.2 }, { opacity: 1 }],
              240,
              (cells.indexOf(mark) / Math.max(1, cells.length - 1)) * 150,
            );
        } else if (kind === "draw") {
          const units = mark.getAttribute("pathLength") || "1";
          const dash = getComputedStyle(mark).strokeDasharray;
          animate(
            mark,
            [
              { strokeDasharray: `0 ${units}` },
              {
                strokeDasharray:
                  !dash || dash === "none" ? `${units} ${units}` : dash,
              },
            ],
            Number(mark.dataset.chartDuration) || 660,
            Number(mark.dataset.chartDelay) || Math.min(seriesIndex++, 3) * 45,
          );
        } else if (kind === "bar-x" || kind === "bar-y") {
          const vertical = kind === "bar-y";
          animate(
            mark,
            [
              {
                transform: vertical ? "scaleY(0)" : "scaleX(0)",
                transformOrigin: vertical ? "center bottom" : "left center",
                transformBox: "fill-box",
              },
              {
                transform: vertical ? "scaleY(1)" : "scaleX(1)",
                transformOrigin: vertical ? "center bottom" : "left center",
                transformBox: "fill-box",
              },
            ],
            520,
            Math.min(seriesIndex++, 12) * 14,
          );
        } else if (kind === "area") {
          animate(
            mark,
            [
              { opacity: 0, clipPath: "inset(0 100% 0 0)" },
              { opacity: 1, clipPath: "inset(0 0 0 0)" },
            ],
            660,
          );
        } else {
          if (fades.length <= 80)
            animate(
              mark,
              [{ opacity: 0 }, { opacity: 1 }],
              320,
              Math.min(seriesIndex++, 12) * 14,
            );
        }
      }
    }
    function schedule() {
      if (disposed) return;
      observer?.disconnect();
      // Defer until the frame before paint. StrictMode's setup/cleanup probe
      // can then cancel without consuming the actual entrance.
      frame = requestAnimationFrame(enter);
    }
    if (!ready) {
      node.setAttribute("data-chart-motion", "waiting");
      return settle;
    }
    if (reduced || typeof node.animate !== "function") {
      played.current = replayKey;
      node.setAttribute("data-chart-motion", "static");
      return settle;
    }
    if (played.current === replayKey) {
      node.setAttribute("data-chart-motion", "ready");
      return settle;
    }
    const rect = node.getBoundingClientRect();
    if (
      rect.bottom > 0 &&
      rect.top < innerHeight &&
      rect.right > 0 &&
      rect.left < innerWidth
    )
      schedule();
    else if (typeof IntersectionObserver !== "undefined") {
      node.setAttribute("data-chart-motion", "pending");
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) schedule();
        },
        { threshold: 0.05 },
      );
      observer.observe(node);
    } else schedule();
    // A real interaction settles the decorative layer immediately.
    function interact() {
      played.current = replayKey;
      settle();
    }
    node.addEventListener("pointerdown", interact, true);
    node.addEventListener("focusin", interact, true);
    return () => {
      disposed = true;
      observer?.disconnect();
      node.removeEventListener("pointerdown", interact, true);
      node.removeEventListener("focusin", interact, true);
      settle();
    };
  }, [ready, replayKey, reduced]);
  return root;
}

export function ChartEntrance({
  ready,
  replayKey,
  children,
  ...props
}: Options & HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const ref = useChartEntrance<HTMLDivElement>({ ready, replayKey });
  return (
    <div {...props} ref={ref}>
      {children}
    </div>
  );
}
