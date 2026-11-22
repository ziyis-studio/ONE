# ONE

A calm personal workspace built for [Planner API](https://github.com/ziyis-studio/planner-api). React 19, TypeScript, Vite 8, Motion, Lucide, Supabase Auth, and self-hosted DM Sans. The interface uses the supplied ONE logo and takes its visual direction from the supplied prototype and login video.

## Run

Requires Node 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Choose **Explore ONE** for an explicit sample (its commands run in Planner API), or sign in to the existing Supabase workspace. The checked-in environment defaults contain only a Supabase URL and publishable key. Override them in ignored .env.local when using another backend. Never put a service-role or secret key in a VITE\_ variable.

```sh
npm run typecheck
npm test
npm run build
```

## Included

- A neutral dark interface with white/gray type, a time-and-weather card with spaced hour/minute groups and animated seconds, varied dashboard card widths, sidebar and mobile navigation, keyboard search (⌘/Ctrl K), and quick creation (N).
- An overview Pomodoro with a dim three-part logo, one moving head and a counterclockwise elapsed trail, 25-minute focus, 5-minute short breaks and 15-minute long breaks after every four focuses. Mode icons sit in the header; reset sits beside start/pause/resume. Completion offers the next phase without starting it automatically. The active timer persists in this browser across navigation, refresh and tabs. Completed focus/break records save to the signed-in user's Supabase account and automatically create ordinary Schedule time blocks with real start/end and pause information. Retrying never duplicates blocks; deleting a generated block preserves completion history. The sample mirrors this locally. Pomodoro never changes task status.
- Email/username password login, signup, password reset and recovery, session refresh, and local sign-out.
- Task board and list, five recent completions on the board with expandable history, drag between statuses, project filters, due dates, tags, completion conditions, and server revision checks.
- Projects with task progress and completion gates. Task cards retain their project badge alongside separate tags. The task Log has a Schedule action beside Add log, with return navigation and retained drafts. Task/project editors include separate private Log and linked Notes tabs; project logs also show entries from their current tasks, with a link back to each task. Logs include clickable linked time blocks, their dates, durations, and past/current/upcoming state. Returning from a block retains the task/project and log drafts. Unsent log drafts stay on this device, and complete backups include logs and log drafts.
- Task cards have a completion checkbox and direct due-date picker. Unfinished tasks without a current or upcoming planned block show an Unscheduled action in Tasks and the Schedule planner; deadlines and recorded focus history do not count as a plan.
- Month/week/day scheduling with month view initially. Due-date tasks appear on their actual date, including an untimed Due row in week/day views. Dragging an open task onto empty timeline space directly saves a linked 30-minute block, snapping to 15 minutes and shortening at the end of the day. Before a task is dropped, week/day timelines show a translucent task and time-range preview at the snapped position. Leaving the track or cancelling clears it without writing; hovering an existing block highlights that block for attachment. Existing-block drops attach links. Blocks remain movable/resizable, and the Plan button opens an editor for manual entry.
- Habit activity heatmaps with This week, This month, Last 30 days, and Year presets, completion/undo by date, and separate planned dates and actual executions. Three habit summary cards show completions, completion rate, and scheduled-day streaks. Sleep starts with Last 30 days and also offers month/year history, range statistics, wake-date grouping and editable day details. Sleep summaries include node tooltips, usual bedtime/wake-up rhythm, and recent sleep/awake composition. Statistics and habit activity cells come from Planner API. Year mode reveals the current date on narrow screens.
- Meals with dated meal types, free-text food/portion notes, up to six private photos, optional kcal/protein/carbs/fat/fiber values, daily totals with coverage, seven-day energy charts and Trash/backup support. Nutrition can be updated externally through the structured database fields.
- A standalone Tags page offers Graph and List views and connects tags with tasks, projects and notes in an animated force graph. Drag nodes, pan, zoom or pinch, pause motion, focus neighbors and open linked items. Filters include item type, tags, completed and untagged records. Its List view pages through the full tag catalogue and connected records with type counts, independent of the graph limit. Editors use a shared searchable tag picker with selected chips and inline creation; existing text-based drafts remain readable. Create, rename/merge and remove tags through Planner API; inherited project tags use dashed links. Reduced motion is respected. Graph reads, relationships and limits are derived on the API; camera/physics are browser presentation state.
- Thought timeline with primary-color calendar marks for recorded dates, date filtering, optional labelled emotion icons in the editor, and conversion into tasks.
- Markdown notes, typed databases (text, number, date, status, checkbox, tags), and record editing.
- Profile username editing with inline validation, accessible ONE confirmations and JSON export.
- Views, searches, filters and calendar/history selection survive module navigation during a workspace visit. Signing out drops that temporary view state.
- Eight primary-color presets and custom HEX values, with readable white labels, browser-local persistence, tab synchronization and a matching white/primary three-part logo and favicon.
- Short closing animations for editors, confirmations, dropdowns and date pickers, with immediate keyboard/focus release, safe reopening and reduced-motion support.
- Shared chart entrances throughout the workspace: line drawing, growing bars, clockwise project progress and small heatmap reveals. Charts wait for data and visibility, replay on range changes, settle on interaction and follow live reduced-motion preferences. Dense yearly maps use one fade per map.
- Explicit sample data stored under one-demo-v1; cloud failures never switch to the sample or save business data locally.

## Data path

Browser → `/api/v1/…` → Planner API → Supabase, using the current user's bearer token.

ONE is a static frontend. Vercel declaratively rewrites `/api/:path*` to the independently deployed Planner API; Vite's development proxy does the same. There are no frontend API functions or business mutation engines. State transitions, ordering, completion gates, persistence, private file access, Pomodoro records, backup imports and username login all execute in `planner-api`. Email authentication/session refresh remains in Supabase Auth. Weather is fetched and cached by the API.

The explicit sample keeps its snapshot on this device and sends stateless sample commands to the API, which never reads or writes an account's database. It requires connectivity for mutations and is never a fallback for cloud failures. Browser-only code handles presentation, navigation, drafts, timer display, preferences and early input feedback. `src/domain/commands.ts` contains wire types only; historical command fixtures under `tests/support` are excluded from the application build.

Public configuration: `VITE_API_URL` (defaults to `/api`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Local Vite proxy target: `PLANNER_API_URL`. When using a separate browser API origin, configure its exact frontend origin in backend `API_ALLOWED_ORIGINS`.

Private task/project notes support Markdown previews, raster images and downloadable PDF/text/CSV/ZIP/Office attachments. Files use immutable owner-scoped references. Backups include both images and files; restoring an existing identity verifies matching contents on the API before accepting it. Image uploads are limited to 5 MiB and documents to 3 MiB.

Projects drag across statuses with completion gates, and task/project order persists across reloads. Task and project cards use pointer dragging with an immediate insertion preview and a rounded page overlay. Focus a card and press Space, use arrow keys, then Enter to drop or Escape to cancel. Moves save once on release; rejected moves restore the saved position. Tasks combine deadline and planned-time actions in one Dates and schedule control. Creating a task from a project returns to its project dialog. Schedule editors show both times together in themed 24-hour segmented controls with duration presets. Sleep logs include one-tap feeling presets; the expanded sleep chart uses smooth curves with labelled dates and durations.

## Hosting

Import this repository into Vercel with the Vite framework preset. vercel.json configures the static frontend build and external API rewrite. Use npm ci; the lockfile pins dependencies.

For signup and password reset on a new production domain, add that exact origin to Supabase Auth's redirect URL allowlist. Existing password login does not depend on a redirect URL. Ensure Planner API's `API_ALLOWED_ORIGINS` includes the exact frontend origin before enabling the rewrite in production. Deploy backend changes before the frontend.

## Verification and limits

Automated checks exercise login steps, all workspace modules, task creation and conditions, Markdown preview, typed records, sample isolation, schedule overlaps and drag interactions, sleep history aggregation, the neutral palette, and authenticated proxy behavior. They use synthetic data and mocked cloud responses, never production-user writes.

Local Chromium checks cover desktop and phone viewports, pointer drag/drop, keyboard/focus behavior and reduced motion. Detailed rehearsals and limits are in `src/components/REHEARSAL.md`. Credentialed production-user writes and physical mobile devices were not used for these checks.

Notes use Markdown rather than a collaborative block editor. Database formulas, relations, rollups, and collaborative editing are outside the existing API contract.

## Weather

The first dashboard card requests current conditions through Planner API, which calls Open-Meteo for a supported workspace time zone and caches results for five minutes. No account credentials or workspace records are sent to Open-Meteo. Failures show an unavailable state, and the card includes manual refresh.

Enhance ONE task mapping and verification: [docs/enhance-one.md](docs/enhance-one.md).

User journey review and verification: [docs/user-journey-review.md](docs/user-journey-review.md).
