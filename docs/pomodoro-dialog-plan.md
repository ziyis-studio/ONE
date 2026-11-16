# Overview focus timer, emotions and closing motion

- Separate the clock hour/minute groups and give the colon breathing room while
  preserving live seconds, tabular figures and the accessible time label.
- Restore optional thought emotions as labelled icon choices. Preserve existing
  values, include a no-emotion choice and save through the existing thought API.
- Fade/settle closing editors, confirmations and owned date/select popovers.
  Capture only a short-lived inert, aria-hidden visual copy after the live popup
  unmounts, so focus restoration and immediate reopening stay reliable. Strip
  IDs, roles and popup ownership from copies; skip reduced motion and StrictMode
  simulated unmounts; remove stale copies when the same popup kind reopens.
- Add an overview Pomodoro with 25-minute focus, 5-minute short break and
  15-minute long break after every four completed focuses. Start/pause/resume,
  reset, mode choice, completion feedback and daily focus count. Deadline-based
  timing survives background throttling, route changes and refresh. Store only
  versioned browser-local timer state, scoped to the workspace; no account data
  mutation or automatic task completion. Do not auto-start the next phase.
- Use the exact white/primary master arcs for countdown progress and a quiet
  active pulse, with reduced motion support. First desktop row: clock, Pomodoro,
  sleep. Second row: habits, tasks, schedule with adjusted widths. Stack cleanly
  on narrow screens and match the loading skeleton to the same layout.

Verify timing, completion-once semantics, pause/deadline boundaries, restore and
invalid storage; emotion persistence; closing copies and rapid popup reopening;
desktop/phone geometry and keyboard focus. Rehearse actual components and run
the relevant tests, full suite and production build before the existing Git /
Vercel publication flow. Retain the existing Stageshow/useLayouts references;
no new animation runtime or faux application demo is needed.
