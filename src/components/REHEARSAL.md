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

# Navigation and shared date/time controls

Plan and references: [navigation-date-motion.md](../../docs/navigation-date-motion.md).

- Desktop sidebar animates from 80 to 224 px without scaling page text; explicit
  toggle, local preference, Ctrl/Cmd+B, active destination, and account actions
  remain connected to the current workspace. Short viewports scroll the route list.
- Mobile More expands from the bottom navigation and closes on selection, Escape,
  backdrop, or desktop resize. Focus containment, return, and scroll restoration
  were exercised. Primary destinations remain available in the dock.
- Task deadlines, habit dates, schedule dates/times, sleep dates/times, and database
  date properties now use the same styled React Aria control, loaded with the lazy
  editor. Date values remain civil strings; the existing workspace timezone logic
  performs conversion at save. React Aria's hidden autofill inputs are not visible
  controls and never open from the calendar button.
- Chromium 156 local app checks at 1440×1000, 1024×1000, 768×1000, and 390×844:
  sidebar width interpolation, reload preference, no horizontal overflow, overnight
  sleep persistence with exact minutes, custom calendar, nested Escape, mobile
  sheet bounds, navigation resize, and OS reduced motion. Additional 320×568 and
  844×390 checks reached the picker controls and exercised its nested Tab scope.
  No browser runtime errors.
- Visual review moved the phone calendar into a bottom sheet so the entire time
  control and Done button remain visible. Partial time edits keep the picker open
  with an inline message; Clear also resets partially filled optional date segments.
- All 70 automated tests across 20 files and the production build passed. Coverage
  includes custom calendar keyboard editing, minimum dates, required/incomplete
  dates, optional Clear, exact minutes, timezone preservation, actual demo sleep
  saves, task deadlines, habit endings, typed database dates, and navigation state.

Local captures and verification scripts: `test-results/navigation-date/` (ignored).
Verification used demo records in local Chromium, not a credentialed production
session. Physical phone keyboards and Safari/Firefox were not tested. The hosting
status is checked separately through Vercel after the commit is pushed.

# Annotated workspace polish

Plan and source references: [workspace-polish-plan.md](../../docs/workspace-polish-plan.md).

- Unified every visible native select (including multi-task selection, database
  properties, inline task status and timezone settings) with one React Aria
  control. The opening/row rhythm follows useLayouts smooth-dropdown; the
  existing MIT license remains retained. Real keyboard selection, typeahead,
  disabled fields, focus return, and parent-dialog Escape behavior are preserved.
- Actual Chromium testing caught a rapid close/reopen focus race while an exit
  animation retained the old popover. Immediate dismissal now gives reopening a
  fresh focus scope; opening and the trigger chevron remain animated. Checked
  selection → immediate reopen → Escape with actual CSS loaded.
- One delegated chart tooltip serves sleep bars, sleep/habit heatmaps, small
  habit history marks and project progress. It displays real dates and durations
  or completion values, supports focus, cleans up event listeners, and observes
  updated values. Hover no longer relies on browser title bubbles on these marks.
- Clock seconds use separate rolling digits with a quiet rule and seconds unit.
  All main pages show today's weekday/date. The sidebar toggle is in the top
  workspace toolbar; the decorative homepage footer has been removed.
- Thoughts no longer asks for an emotion. Existing emotion metadata survives an
  edit. Timestamp text, dots and rules share grid geometry on desktop and phone.
- Day and week share the same timeline track, hour scale, overlap layout and
  gesture behavior. The week has seven timed columns and horizontal scrolling on
  phones, with the hour gutter retained. Month remains the default view.
- Schedule tasks appear to the right on wide screens and below on narrow screens.
  Real HTML drag/drop attaches a task to a block with revision checking and keeps
  its time, existing task links, habit-occurrence links and task status intact.
  Repeating a drop is idempotent. The Plan button also supports keyboard/touch
  users and opens a new block with the task already selected.

Verification: 78 tests across 23 files and the production build passed. Local
Chromium 156 at 1703×1000, 921×764, 390×844 and reduced motion covered all module
headings, no visible native selects, clock/chart appearance, tooltip bounds,
thought-axis geometry, dropdown keyboard selection and rapid reopening, week
layout, actual drag-to-link persistence, duplicate drop and mobile multi-select.
A spring DST gap is reported through ONE feedback without crashing its drag
preview or saving an invalid time. No browser runtime errors were observed.
Captures and scripts are in ignored
`test-results/workspace-polish/`. These checks used local demo records, not a
credentialed production session or a physical phone; Safari/Firefox were not tested.

# Violet branding, cards and page loading

Plan: [cards-loading-plan.md](../../docs/cards-loading-plan.md). The user's
Frame.io / Obsidian direction is applied as #7852EE primary actions and #A882FF
marks/focus on the neutral foundation. Both exact master logo paths remain;
the short workspace/auth arc carries the accent, with a separate violet favicon.
White primary-button text passes 4.5:1 contrast at rest and hover.

- Project and task surfaces open their editors through a native keyboard target
  and background clicks. Inline rename, project expansion, completion and native
  task dragging stay independent. Corner action menus and task-lane bottom add
  controls are removed. Project-column add controls now sit in each header.
- Project icon/title/tag/date share the header, including the list layout and
  narrow cards. Status and Tags align before Description in both editors. Only
  the specifically marked home/calendar/project separators were removed.
- Each of the nine routes has its own loading structure. Actual lazy-module
  interception checked all eight non-home fallbacks and successful resolution;
  loading and ready title positions differed by less than one pixel. Phone
  layouts stay within the viewport and reduced motion disables decorative pulse.
- Untitled time blocks derive linked task names in home, month, week, day and
  search. Real browser renaming updated the derived label while the saved block
  title stayed empty. Explicit titles remain authoritative; unit coverage includes
  multiple, duplicate and removed links. Search opens the real block editor.

Verification: 86 tests across 24 files and the production build passed. Chromium
156 checks at 1703×1000 and 390×844 covered actual card opening, nested controls,
native drag/drop persistence, keyboard activation, form geometry, all loading
layouts, reduced motion and all three project-header add controls. No browser
runtime errors were observed. Captures/scripts are in ignored
`test-results/cards-loading/`. These used local demo data, not a credentialed
production session; physical mobile devices and Safari/Firefox were not tested.
