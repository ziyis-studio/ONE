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

# Configurable primary color and solid selection

Plan: [appearance-plan.md](../../docs/appearance-plan.md). The active sidebar,
tabs, dropdown selections, date cells and editor choices now use the exact
primary color and white labels. The sidebar indicator is white. Disabled
controls and low history intensities use grayscale, with no translucent accent
backgrounds.

Settings offers eight presets, a custom HEX field with inline validation and
reset to Violet. All accepted colors support white labels at 4.5:1 or better.
The versioned browser preference restores before paint, synchronizes tabs and
degrades to an in-memory choice if storage is unavailable. Inline workspace
logos retain both exact master paths; auth marks and the favicon use the same
preference. Custom submission preserves input focus and works with Enter.

Verification: 91 tests across 25 files and the production build passed. Real
Chromium at 1703×1000, 921×764 and 390×844 checked computed selection colors,
white text/indicator, keyboard radio navigation, custom errors, picker and both
dropdown families, refresh persistence, login styling and actual cross-tab
updates. All nine desktop and phone routes stayed within the viewport and had
no browser runtime errors. Reviewed hook dependencies, listener cleanup, native
semantics, editable draft synchronization and lazy component boundaries using
the React Best Practices checklist; no new dependency or data command was added.

Captures/scripts are in ignored `test-results/appearance/`. Review findings and
remaining work are recorded in [uiux-review.md](../../docs/uiux-review.md).
These checks used local sample data and desktop Chromium with phone viewports;
credentialed production flows, physical touch devices and other browser engines
were not re-tested in this pass.

# Workspace confirmations, navigation memory and planning

Plan: [workflow-followups-plan.md](../../docs/workflow-followups-plan.md).

- All native confirmations are replaced by one asynchronous alert dialog with
  cancel as the initial focus, inert background, keyboard trapping, Escape and
  backdrop cancellation, focus restoration and immediate removal. Parent editors
  yield keyboard control to the confirmation and their owned dropdown/date
  popovers. Deletion remains explicit; cancel preserves drafts. Username feedback
  matches the existing profile API rules and deduplicates pending saves.
- View/filter/search state, calendar selection/panel and history ranges are
  retained in memory for this workspace visit. Signing out drops that state;
  resetting the sample clears views while keeping appearance. A deleted project
  filter falls back to All projects.
- All task/project column plus controls preselect the column stage. Optional
  initial-stage API input stores existing start/work/completion fields atomically.
  Done tasks with unmet conditions reject without partial records. The shared
  demo command engine matches the backend; no database migration is needed.
- Sleep defaults to an accessible 30-day grid, with month/year presets, range
  statistics and period navigation. Year mode scrolls its own container to the
  selected date, including the phone layout.
- Calendar month cells and week/day Due rows show deadline tasks, including
  completed history. The 22nd was checked with a sample “Finish Telus exam.”
  Due rows stay above the scrolling hour grid. Existing appointments remain
  visible and additional entries open through the day view.
- Real native task dragging uses move effects. Empty-track drops persist linked
  unnamed blocks directly, with no editor; repeated identical drops are guarded.
  Default duration is 30 minutes, shortened at the end of the day. Existing block
  drops keep their link-preserving behavior and the Plan button remains editable.
  Task deadlines/status are untouched. Today's header now has a compact primary
  date badge on a neutral surface. The favicon retains a white long arc and
  themed short arc, exactly like the workspace mark.

Verification: 102 frontend tests in 28 files, the production build, and 48 backend
tests in 10 files plus backend typechecking passed. Local Chromium 156 at
1703×1000 and 390×844 covered actual task dragging/persistence and move feedback,
due dates, contextual creation, confirmation cancel/accept/focus, view memory,
mobile history and reduced motion. No native browser dialogs or runtime errors
were observed. API tests cover strict initial-stage parsing, all seven creation
columns, completed-parent behavior and rejection without partial records.

Artifacts: ignored `test-results/followups/`. Tests used local samples and mocked
profile responses; credentialed production-user writes and physical phones were
not exercised. React component/hook, semantics, cleanup and lazy-boundary checks
were applied. Supabase's current changelog/getSession documentation was reviewed;
the authenticated profile transport and server ownership/RLS rules are unchanged.

# Overview Pomodoro, thought emotions and popup exits

Plan: [pomodoro-dialog-plan.md](../../docs/pomodoro-dialog-plan.md).

- The overview's first desktop row contains Clock, Pomodoro and Sleep. The second
  contains Habits, Tasks and Schedule at progressively wider widths; phone cards
  stack in the same reading order. The pending overview shares these grid rules.
  Separate hour/colon/minute groups give the live clock consistent spacing.
- Thoughts offer optional labelled emotion icons with native radio keyboard
  behavior, a no-emotion choice and preservation of legacy values. Creation,
  editing and clearing use the existing thought command and dirty-draft handling.
- The Pomodoro uses the exact white long arc and themed short arc for remaining
  time, a quiet active pulse and completion feedback. Focus/short/long modes are
  25/5/15 minutes; every fourth completed focus offers a long break. Start, pause,
  resume, reset and mode selection preserve deliberate user control; reselecting
  the active mode does not reset it. The next phase never starts automatically.
- Deadline-based timing survives route changes, refresh, background throttling
  and browser-tab synchronization. Versioned local storage is scoped to the
  workspace, handles invalid/unavailable storage and records focus counts by
  workspace day. Completion counts once and never changes business/task data.
  This timer preference is browser-local, without cross-device synchronization.
- Editors, confirmations and shared date/select popovers fade and settle on
  dismissal. The live popup releases focus immediately; only an inert,
  aria-hidden visual remains for at most 240ms. Copies preserve values/scroll,
  strip IDs/roles/ownership, skip simulated StrictMode unmounts and are removed
  when another popup opens. Reduced motion skips the exit visual and logo pulse.

Verification: 112 tests across 32 files and the production build passed. Real
local Chromium at 1703×1000, 921×764 and 390×844 checked actual card geometry,
hour/minute gaps, timer tick/pause/resume/reset, navigation/refresh restoration,
real shared-context tab synchronization, fourth-focus completion and long break,
task-data isolation, saved emotions, modal/confirmation/select/date exits,
immediate reopening, stripped copy identity, phone geometry and reduced motion.
No native browser dialogs or runtime errors were observed. Reviewed hook cleanup,
provider scoping, native input semantics, focus ownership and rendering work
against the React Best Practices checklist. No dependency, schema or backend
change was needed.

Artifacts: ignored `test-results/pomodoro/`. These are actual component/application
checks with local sample data and mocked weather, not a Stageshow faux-demo gate.
Credentialed production-user writes, physical phones and other browser engines
were not exercised in this pass.

# Tri-segment brand update

Plan: [tri-segment-motion-plan.md](../../docs/tri-segment-motion-plan.md).
The supplied three exact O/N/E paths now share one geometry definition across
navigation, auth/save/loading feedback, themed favicon, Pomodoro and project
progress. O/N remain white and E follows the primary mark color. The original
black, white and currentColor masters are retained under `public/brand/`.

Loading draws E slowly (720ms), N at medium speed (480ms), O quickly (260ms),
holds, then fades together on a 2.4s loop. Error uses a staggered three-piece
recoil; success lights and gathers the three pieces. Reduced motion stays still;
existing hidden/offscreen pause, frame cleanup and login transition ownership
remain. Progress distributes over the new 180:72:36 arc lengths.

The user explicitly requested skipping tests to save tokens. No automated suite,
browser rehearsal, Stageshow film gate or visual check was run for this update.
The production build passed. React hook cleanup, stable keys, shared geometry
and reduced-motion behavior were reviewed in source.

# Smooth logo acceleration and recorded Pomodoro sessions

Plan: [pomodoro-records-plan.md](../../docs/pomodoro-records-plan.md).

Loading now uses quintic smoothing with zero initial velocity/acceleration per
segment. E/N/O draw over 860/600/860ms on a 3.3s cycle, so the long arc has time
to build speed and settle. Error changes only E to the semantic red token;
white O/N and reduced-motion handling stay intact.

The Pomodoro removes its narrative heading/paragraph, centers its dial and keeps
one main action plus a daily summary. Dim tracks fill with actual elapsed time,
counterclockwise from O to N to E, using reversed versions of the exact supplied
paths. Start/reset stays dim; pause freezes progress; completion fills the ring.
The repeated decorative pulse is removed.

Completed focus/break sessions have stable UUIDs and keep their original start
through pauses/resumes. The existing planner-core project now has an append-only
`pomodoro_sessions` table, with owner-only SELECT/INSERT RLS, validated mode,
duration/time constraints, a composite ownership key and indexed day lookup.
Its canonical Planner API migration is `20261117084448_pomodoro_sessions.sql`,
matching the applied Supabase migration version. The frontend uses the existing
publishable client/session; no elevated key or backend API change was added.
The latest 128 browser records retry idempotently after reconnect or manual
refresh. Cloud history and local completions merge for the workspace day's
count. Active countdowns remain browser-local; demo never contacts this table.

Verification: 18 tests in six files and the production build passed. Real local
Chromium at 1703px, 921px and 390px checked the long arc's acceleration, red-only
error segment, centered clean card, counterclockwise progress, dim reset,
pause/completion persistence, demo isolation and reduced motion; no runtime
errors or native dialogs were observed. Rolled-back queries on the actual
database verified owner reads/inserts, cross-owner/anonymous denial, duration
validation, immutable records and duplicate retry handling. Catalog checks
confirmed enabled RLS and exactly SELECT/INSERT grants for authenticated users.
The client tests cover owner/day queries and offline retry of the same IDs.

Artifacts: ignored `test-results/focus-records/`. Browser checks used samples and
mock weather; database verification used a rolled-back fixture. A credentialed
production browser write, physical phones and other browser engines were not
exercised. The full unrelated regression suite was not repeated in this pass.

# Compact horizontal Pomodoro

Plan: [pomodoro-compact-plan.md](../../docs/pomodoro-compact-plan.md).
The ring is now alone on the left. Mode icons, a separate larger countdown,
phase, main action and daily summary share the right column. Focus/short/long
use Target/Coffee/Armchair, with named pressed buttons, keyboard focus and
custom hover/focus labels. The shared tabs' icon-only option defaults off.
The first-row and loading minimum drops from 315px to 250px; actual ready cards
measured 250–261px across the checked widths. Timer/history behavior is unchanged.

Verification: production build passed. Local Chromium at 1703, 921, 701, 390 and
320px checked left-ring/right-controls geometry, no countdown inside the ring,
matching desktop row heights, no viewport overflow, icon names/selection,
keyboard mode changes, focus labels, start/pause/resume/reset and reduced motion.
No browser runtime errors were observed. Captures/scripts are in ignored
`test-results/pomo-compact/`. No automated suite was repeated for this visual
change; physical touch devices and other browser engines were not exercised.

# Pomodoro terminal head and automatic Schedule recording

Plan: [pomodoro-timeline-plan.md](../../docs/pomodoro-timeline-plan.md).

The elapsed stroke now uses a normalized dash with a two-unit gap, preventing a
zero/tiny dash from repeating at the opposite terminal. Only one explicit head
is bright; the trail is dimmer and follows the reversed exact master arcs.
New sessions remount the elapsed paths, reset clears them immediately, and mode
icons occupy the header. Reset sits beside the main action; the cloud button is
removed. Header icon labels open below the controls to stay inside the card.

Completion inserts now atomically create ordinary time blocks via an invoker-
security trigger. Owner RLS, a deferred composite ownership FK and a covering
unique index protect the link. Actual start/end and focus/break/pause durations
are recorded. Existing completion rows are backfilled once. Deleting a generated
block clears the link without deleting history; repeated completion uploads do
not recreate it. Quiet workspace refreshes discard stale results when a user
command is in flight. Sample mode mirrors the mapping and remembers each link.

Verification: 18 focused tests across six files and the production build passed.
Local Chromium at 1703, 1087, 701, 390 and 320px checked header modes, reset/action
alignment, no cloud control, one startup head, pause/reset, completion visible
in the day timeline/editor, refresh deduplication, explicit deletion, subsequent
break recording and preserved tasks. No runtime errors were observed. In the
startup capture, the head reached RGB 238 while the opposite end remained at 58. Real rolled-back SQL verified atomic block creation, pause data, duplicate
retry, invoker RLS, invalid-zone rollback and history retention after deletion.
Security/performance advisors report no new Pomodoro findings after adding the
composite covering index. Client tests also cover a quiet refresh racing a user
command without losing its resulting snapshot.

Artifacts: ignored `test-results/pomo-timeline/`. Browser checks used local
samples/mock weather; authenticated DB verification was rolled back. A signed-in
production browser write, physical touch devices and other browser engines were
not exercised. The unrelated full regression suite was not repeated.
