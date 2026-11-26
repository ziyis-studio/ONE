import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "motion/react";
import { useMotionPreference } from "../lib/motion-preference";

/** Animate confirmed changes, without celebrating tasks already complete on load. */
export default function DashboardTaskCheck({
  checked,
  label,
  disabled,
  onClick,
}: {
  checked: boolean;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const reduced = useMotionPreference(),
    controls = useAnimationControls(),
    previous = useRef(checked);
  useEffect(() => {
    if (checked && !previous.current && !reduced)
      void controls.start({
        scale: [1, 0.88, 1.18, 1],
        transition: {
          duration: 0.36,
          times: [0, 0.22, 0.58, 1],
          ease: "easeOut",
        },
      });
    else controls.set({ scale: 1 });
    previous.current = checked;
  }, [checked, reduced, controls]);
  return (
    <motion.button
      type="button"
      className={`check-button dashboard-task-check${checked ? " checked" : ""}`}
      aria-label={label}
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
      initial={false}
      animate={controls}
      data-reduced={reduced || undefined}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <motion.path
          d="m5 12 4 4L19 6"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{
            duration: reduced ? 0 : checked ? 0.22 : 0.12,
            delay: reduced || !checked ? 0 : 0.06,
          }}
        />
      </svg>
    </motion.button>
  );
}
