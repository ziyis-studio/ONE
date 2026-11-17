import { useLayoutEffect, useRef } from "react";
import { useMotionPreference } from "../lib/motion-preference";
import { ONE_SEGMENTS } from "../lib/brand-mark";
import "./logo-motion.css";

export type AuthLogoState = "idle" | "loading" | "error" | "success";
// Short E draws slowly, N accelerates, then the long O completes quickly.
const lighting = {
  short: { start: 0, duration: 860 },
  medium: { start: 860, duration: 600 },
  long: { start: 1460, duration: 860 },
};
const ease = (n: number) => n * n * (3 - 2 * n);
// Zero velocity/acceleration at each join; the long arc has room to accelerate.
const lightEase = (n: number) => n * n * n * (n * (n * 6 - 15) + 10);
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
      const time = elapsed % 3300;
      const fade = 1 - ease(clamp((time - 2680) / 440));
      paths.forEach((path, i) => {
        if (!path) return;
        const beat = lighting[ONE_SEGMENTS[i].name];
        const length = lightEase(clamp((time - beat.start) / beat.duration));
        path.style.strokeDasharray = `${Math.max(0, length)} 2`;
        path.style.strokeDashoffset = "0";
        path.style.opacity = String(
          length < 0.003
            ? 0
            : fade * (0.3 + length * 0.7) * ease(clamp(elapsed / 320)),
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
      {ONE_SEGMENTS.map(({ d, name }, i) => (
        <g key={d} className={`auth-arc auth-arc-${name}`}>
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
