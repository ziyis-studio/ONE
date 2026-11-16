# ONE login rehearsal

Reference: [Stageshow / form-error](../../.agents/skills/stageshow/examples/form-error/index.tsx).
Borrowed its reserved feedback lane, field-local explanation, and stable submit
control. The real login uses ONE's own controls and live Supabase integration;
no faux authentication or Stageshow demo runtime ships in the app.

The uploaded 26° master supplies both exact arc paths. Only the Motion Lab's
2.4-second light sweep was referenced. Error is a one-shot counter/recoil of the
two arcs; success draws the long arc, then the short, and settles before exit.
The master is also `public/logo.svg` for the workspace and favicon.

## Checked

- Chromium 156, Linux desktop; real page at 1440×900 and 390×844.
- Inspected opening, loading, local validation, failed credentials, retry and
  success frames. The mark stays in place; both original gaps stay open.
- Real form flow with intercepted test responses: failed password → edit →
  successful Supabase auth event → visible success → home. No live credentials
  or account records were used. The real service endpoints remain unchanged.
- Signup, email confirmation, reset, recovery, rate limits, network errors,
  duplicate submission, and success gate covered by automated interaction tests.
- Reduced motion at fresh load and while active; all frame work stops when it is
  enabled. Frame-loop and timer cleanup checked, including unmount after success.
- Stageshow layout scan at 1440 and 390: no issues detected. Rehearsed the actual
  AuthLogo component in a development-only Stage, with contact sheets and marked
  states. Wide and phone loop captures completed at frame cadence; some high-frequency captures
  had sampling gaps and were treated as inconclusive, then inspected manually.
- Compared the form against the `form-error` reference: ONE keeps a single input
  step, monochrome ink, no window chrome, and its supplied mark as the focal point.
  Visual review found and fixed visible screen-reader text and stale loader
  strokes during the error transition.

Local captures/reports are under ignored `test-results/auth-motion/`; source
motion plan is [one-auth-motion-plan.md](../../docs/one-auth-motion-plan.md).

## Limits

This pass did not include real credential login, outgoing confirmation email, a
physical mobile keyboard, Safari/Firefox, or independent review. Browser
checks used Chromium desktop with a phone viewport. Geometry scans and contact
sheets do not prove smoothness on every device.

# Workspace interactions

The first ten approved useLayouts patterns are now adapted to real workspace
records. Source mapping and retained MIT license are in
[uselayouts-motion.md](../../docs/uselayouts-motion.md).

Checked in Chromium 156 on Linux at 1440×960 and 390×844:

- Home Recent/Linked preview, global Create, menu opening after a long page
  scroll, Escape and outside dismissal, keyboard arrows/Tab, and editor focus.
- Project summary/task expansion, board-to-row morph, inline rename, real status
  filtering, and repeat-day editing/save with persisted demo commands.
- Inspected full-page and dialog captures. Fixed menu measurement after scroll,
  stale exiting menu content, legacy CSS competing with layout transforms, and
  base/component stylesheet order. Save labels keep one footprint and one
  accessible name while changing.
- OS reduced motion at entry and while a menu is open. No second animation
  runtime or additional dependency was introduced.
- Automated checks cover preservation of data and links, original edit revision,
  request failure/retry, duplicate submission, optional titles, and cleanup of a
  save that resolves after its editor unmounts.

Captures: `test-results/workspace-motion/` (ignored local artifacts). No real
credentialed writes, physical phone keyboard, Safari/Firefox, or independent
visual reviewer were used. These are real app flows, rather than faux UI scenes;
Stageshow's isolated demo gate is not used to claim full app verification.
