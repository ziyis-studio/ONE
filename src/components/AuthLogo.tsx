import { useLayoutEffect, useRef } from "react";
import { useMotionPreference } from "../lib/motion-preference";

export type AuthLogoState = "idle" | "loading" | "error" | "success";
// Exact paths from ONE-logo-26deg-master.svg. Keep the two 26° gaps open.
const arcs = [
  "M 71.064 77.952 A 35 35 0 1 1 63.111 17.549",
  "M 76.010 26.580 A 35 35 0 0 1 81.185 65.890",
];
const ease = (n: number) => n * n * (3 - 2 * n);
const clamp = (n: number) => Math.max(0, Math.min(n, 1));

export function AuthLogo({ state }: { state: AuthLogoState }) {
  const reduced = useMotionPreference();
  const mark = useRef<SVGSVGElement>(null);
  const lights = useRef<(SVGPathElement | null)[]>([]);
  useLayoutEffect(() => {
    if (state !== "loading" || reduced) return;
    const paths = [...lights.current];
    let frame = 0,
      elapsed = 0,
      previous = 0;
    function tick(now: number) {
      if (previous) elapsed += Math.min(now - previous, 64);
      previous = now;
      const p = (elapsed % 2400) / 2400;
      let starts = [0, 0],
        ends = [1, 1],
        fade = 1;
      if (p < 0.42) {
        const k = ease(p / 0.42);
        ends = [clamp(k * 1.08), clamp((k - 0.2) / 0.8)];
      } else if (p >= 0.58) {
        const k = ease((p - 0.58) / 0.42);
        starts = [k, clamp(k * 1.12)];
        fade = 1 - k * 0.3;
      }
      paths.forEach((path, i) => {
        if (!path) return;
        const length = ends[i] - starts[i];
        path.style.strokeDasharray = `${Math.max(0, length)} 2`;
        path.style.strokeDashoffset = String(-starts[i]);
        path.style.opacity = String(
          length < 0.003 ? 0 : fade * ease(clamp(elapsed / 500)),
        );
      });
      frame = requestAnimationFrame(tick);
    }
    function visibility() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden && visible) frame = requestAnimationFrame(tick);
    }
    let visible = true;
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            visibility();
          });
    if (mark.current) observer?.observe(mark.current);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      paths.forEach((path) => path?.removeAttribute("style"));
    };
  }, [state, reduced]);
  return (
    <svg
      ref={mark}
      className="auth-mark"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      data-state={state}
      data-reduced={!!reduced}
    >
      {arcs.map((d, i) => (
        <g
          key={d}
          className={`auth-arc auth-arc-${i === 0 ? "long" : "short"}`}
        >
          <path
            d={d}
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="auth-arc-track"
          />
          <path
            ref={(node) => {
              lights.current[i] = node;
            }}
            d={d}
            pathLength="1"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="auth-arc-light"
          />
        </g>
      ))}
    </svg>
  );
}
