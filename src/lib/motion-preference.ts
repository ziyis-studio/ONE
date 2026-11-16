import { useContext, useSyncExternalStore } from "react";
import { MotionConfigContext } from "motion/react";

const query = "(prefers-reduced-motion: reduce)";
const media = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;
function subscribe(notify: () => void) {
  const preference = media();
  preference?.addEventListener("change", notify);
  return () => preference?.removeEventListener("change", notify);
}
const snapshot = () => media()?.matches ?? false;
const serverSnapshot = () => false;

// Motion's hook reads the initial preference; the logo also follows live changes.
export function useMotionPreference() {
  const { reducedMotion } = useContext(MotionConfigContext);
  const system = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return reducedMotion === "always" || (reducedMotion !== "never" && system);
}
