# ONE

A calm personal workspace built for [Planner API](https://github.com/ziyis-studio/planner-api). React 19, TypeScript, Vite 8, Motion, Lucide, Supabase Auth, and self-hosted DM Sans. The interface uses the supplied ONE logo and takes its visual direction from the supplied prototype and login video.

## Run

Requires Node 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Choose **Explore ONE** for an explicit local sample, or sign in to the existing Supabase workspace. The checked-in environment defaults contain only a Supabase URL and publishable key. Override them in ignored .env.local when using another backend. Never put a service-role or secret key in a VITE\_ variable.

```sh
npm run typecheck
npm test
npm run build
```

## Included

- A neutral dark interface with white/gray type, a time-and-weather card with spaced hour/minute groups and animated seconds, varied dashboard card widths, sidebar and mobile navigation, keyboard search (⌘/Ctrl K), and quick creation (N).
- An overview Pomodoro with the white/primary two-part logo as its progress dial, 25-minute focus, 5-minute short breaks and 15-minute long breaks after every four focuses. Start, pause, resume, reset and choose modes; completion offers the next phase without starting it automatically. Timer state and daily focus counts persist locally per workspace, survive navigation/refresh and synchronize browser tabs; they do not change task status or sync across devices.
- Email/username password login, signup, password reset and recovery, session refresh, and local sign-out.
- Task board and list, drag between statuses, project filters, due dates, tags, completion conditions, and server revision checks.
- Projects with task progress and completion gates.
- Month/week/day scheduling with month view initially. Due-date tasks appear on their actual date, including an untimed Due row in week/day views. Dragging an open task onto empty timeline space directly saves a linked 30-minute block, snapping to 15 minutes and shortening at the end of the day. Existing-block drops attach links. Blocks remain movable/resizable, and the Plan button opens an editor for manual entry.
- Habit activity heatmaps with This week, This month, and Last 30 days presets, completion/undo by date, and separate planned dates and actual executions. Sleep starts with Last 30 days and also offers month/year history, range statistics, wake-date grouping and editable day details. Year mode reveals the selected date on narrow screens.
- Thought timeline, date filtering, optional labelled emotion icons in the editor, and conversion into tasks.
- Markdown notes, typed databases (text, number, date, status, checkbox, tags), and record editing.
- Profile username editing with inline validation, accessible ONE confirmations and JSON export.
- Views, searches, filters and calendar/history selection survive module navigation during a workspace visit. Signing out drops that temporary view state.
- Eight primary-color presets and custom HEX values, with readable white labels, browser-local persistence, tab synchronization and a matching white/primary two-part logo and favicon.
- Short closing animations for editors, confirmations, dropdowns and date pickers, with immediate keyboard/focus release, safe reopening and reduced-motion support.
- Explicit sample data stored under one-demo-v1; cloud failures never switch to the sample or save business data locally.

## Data path

Browser → /api/proxy?path=/v1/… → the existing https://planner-api-ziyis-studio.vercel.app → Supabase, using the current user's bearer token.

The same-origin proxy is a small Vercel Node function. It forwards only supported API routes and selected headers, bounds request bodies, rejects foreign origins, and does not retry writes. Planner API continues to own validation, transactions, revision checks, ownership, and RLS. Username login goes through the existing username-login Edge Function. Email login and session refresh use Supabase Auth directly.

No database migration or elevated Supabase credentials are required. The domain files in src/domain are carried from Planner API for type compatibility and correct sample-mode behavior; authenticated mutations always execute on the server.

Server-only overrides: PLANNER_API_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Public overrides: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_PROXY_URL.

## Hosting

Import this repository into Vercel with the Vite framework preset. vercel.json configures the frontend build and /api/proxy function. Use npm ci; the lockfile pins dependencies.

For signup and password reset on a new production domain, add that exact origin to Supabase Auth's redirect URL allowlist. Existing password login does not depend on a redirect URL. No changes to Planner API's browser CORS allowlist are needed because ONE uses the same-origin transport.

## Verification and limits

Automated checks exercise login steps, all workspace modules, task creation and conditions, Markdown preview, typed records, sample isolation, schedule overlaps and drag interactions, sleep history aggregation, the neutral palette, and authenticated proxy behavior. They use synthetic data and mocked cloud responses, never production-user writes.

Local Chromium checks cover desktop and phone viewports, real native drag/drop, keyboard/focus behavior and reduced motion. Detailed rehearsals and limits are in `src/components/REHEARSAL.md`. Credentialed production-user writes and physical mobile devices were not used for these checks.

Notes use Markdown rather than a collaborative block editor. Database formulas, relations, rollups, and collaborative editing are outside the existing API contract.

## Weather

The first dashboard card reads current conditions from Open-Meteo for the city shown. The city follows supported workspace time zones (Kuala Lumpur by default); this does not infer the device’s precise location. No account credentials or workspace records are sent to Open-Meteo. Requests time out after 10 seconds, failures show an unavailable state, and the card includes manual refresh.
