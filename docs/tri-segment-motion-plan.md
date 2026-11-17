# ONE tri-segment mark

The supplied master is the geometry source: O 180°, N 72°, E 36°, with three
24° gaps and 8-unit rounded strokes. Preserve all exact path coordinates.
The supplied README describes these assets; the user's request determines scope.
Keep O/N white and E in the user's primary mark color. Preserve all three
uploaded variants, and update static assets and the runtime themed favicon.

- Idle: still, complete mark.
- Loading: E draws/brightens over 720ms, N over 480ms, then O over 260ms.
  Hold the complete ring for 380ms, fade together for 400ms, rest for 160ms;
  loop every 2.4s. Pause hidden/offscreen frame work and clean up on state change.
- Error: three distinct outward offsets recoil and settle in one brief sequence.
- Success: E/N/O light in a faster sequence while the pieces gather into place,
  finishing inside the existing login transition hold.
- Reduced motion: still states, no frame loop or recoil.
- Pomodoro and project progress use the same three paths and their actual
  180:72:36 lengths; no timer or task-data behavior changes.

Apply to navigation, login, save feedback, generic loading, favicon and progress
rings. Per the user's instruction, skip automated tests and browser rehearsal;
run only the production build needed to publish. No animation dependency added.
