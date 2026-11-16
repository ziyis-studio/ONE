# ONE

A calm personal workspace built for [Planner API](https://github.com/ziyis-studio/planner-api). React 19, TypeScript, Vite 8, Motion, Lucide, Supabase Auth, and self-hosted DM Sans. The interface uses the supplied ONE logo and takes its visual direction from the supplied prototype and login video.

## Run

Requires Node 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Choose **Explore ONE** for an explicit local sample, or sign in to the existing Supabase workspace. The checked-in environment defaults contain only a Supabase URL and publishable key. Override them in ignored .env.local when using another backend. Never put a service-role or secret key in a VITE_ variable.

```sh
npm run typecheck
npm test
npm run build
```

## Included

- A neutral dark interface with white/gray type, a time-and-weather card first, varied dashboard card widths, sidebar and mobile navigation, keyboard search (⌘/Ctrl K), and quick creation (N).
- Email/username password login, signup, password reset and recovery, session refresh, and local sign-out.
- Task board and list, drag between statuses, project filters, due dates, tags, completion conditions, and server revision checks.
- Projects with task progress and completion gates.
- Month/week/day scheduling with month view as the default. Drag blocks between dates, move/resize them directly on the day timeline, or drag empty desktop timeline space to create a time block. Changes snap to 15 minutes; linked tasks/occurrences and revision checks are preserved.
- Weekly habits with separate planned dates and actual executions. Sleep history uses an interactive year heatmap with wake-date grouping, net duration, year navigation, and editable day details.
- Thought timeline, date filtering, emotion labels, and conversion into tasks.
- Markdown notes, typed databases (text, number, date, status, checkbox, tags), and record editing.
- Profile username editing and JSON export.
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

The managed browser/preview service was unavailable during the initial implementation, so actual desktop/mobile visual QA and an authenticated real-account production round trip still need verification. The application does not claim either check has passed.

Notes use Markdown rather than a collaborative block editor. Database formulas, relations, rollups, and collaborative editing are outside the existing API contract.

## Weather

The first dashboard card reads current conditions from Open-Meteo for the city shown. The city follows supported workspace time zones (Kuala Lumpur by default); this does not infer the device’s precise location. No account credentials or workspace records are sent to Open-Meteo. Requests time out after 10 seconds, failures show an unavailable state, and the card includes manual refresh.
