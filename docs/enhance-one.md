# Enhance ONE — implementation and verification

Source: ONE Database → Project **Enhance ONE**, all 10 open task titles and descriptions/notes read on November 19, 2026. No linked Notes were present. Task completion remains manual; these records were not marked done.

| Task                                                      | Result                                                                                                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag projects across statuses; reorder projects and tasks | Native board/list drag interactions, keyboard arrow controls, persisted global order, atomic backend status-and-position commands, revision checks and existing completion gates.                              |
| Sleep Log feeling icons                                   | Five labelled presets: Rested, Good, Okay, Tired, Exhausted. Optional rest notes remain editable. History shows the selected icon.                                                                             |
| Hide Focus for done tasks                                 | The shared Focus button renders only for unfinished tasks, including Overview, Tasks and editor actions.                                                                                                       |
| Larger curved Average Sleep chart                         | Full-width smooth curve with grid, duration scale, logged-date labels, inspectable points and a gentle area fill. Missing days are not counted as zero sleep.                                                  |
| Merge Calendar and Unscheduled                            | One Dates and schedule trigger opens an inline due-date calendar and Plan time action. The Schedule sidebar also has a single planning action for unplanned tasks.                                             |
| Attach files/images and Markdown task/project notes       | Markdown edit/preview, private raster images, PDF/text/CSV/ZIP/Office files. Downloads and immutable backup restores go through authenticated API routes and owner Storage RLS.                                |
| Improve task/project dialog layout                        | Actions span the dialog's full width, with Create/Save at the bottom right and a responsive Log/linked Notes section. Uploads block saving/closing until their reference is ready.                             |
| Improve overall UI/UX                                     | Consolidated controls, keyboard ordering, responsive chart/editor layouts and fewer scheduling steps. The supplied Rednote item returns a login page; its visual content could not be inspected or reproduced. |
| Return to project after adding a task                     | Creating or cancelling a task from a project returns to that same project's dialog; Markdown/context and project association are preserved.                                                                    |
| Reduce schedule time setup steps                          | Direct start/end time fields, one shared date, an optional separate end date and 30/60/90/120 minute presets. No per-time picker Save step.                                                                    |

## Runtime ownership

The browser ships no API function, command mutation engine, recovery mutation engine or direct Supabase business-table/Storage access. Static Vercel rewrites and the local Vite proxy forward to Planner API. The backend owns transitions, ordering, validation, completion gates, persistence, private attachments, focus records, sample mutations, username-login forwarding and weather fetching/caching. Supabase Auth manages email authentication/session refresh. Browser code retains UI state, active countdown display, preferences, drafts and early input feedback.

The former sample command engine now exists only in backend source and test-only fixtures. `tests/support` does not ship in the frontend bundle. Explore ONE needs the API for mutations; its device snapshot is never substituted for an account's failed cloud request.

## Database rollout

Applied to ONE Database:

- `20261119130420_enhance_one_ordering_and_attachments.sql`
- `20261119130433_attachments_image_uploads.sql`

The new owner-scoped RPCs include order fields; legacy workspace/backup RPC shapes remain unchanged so the existing backend continues working during independent rollout. The attachment bucket is private and limited to 3 MiB. Policies prevent anonymous access, foreign paths, owner changes and overwrites.

A hosted synthetic transaction verified the write allowlist, ordered reads, backup order, old response compatibility and cross-owner isolation, then rolled back. A follow-up query confirmed the test account was absent. Security advisors introduced no new findings.

Deploy Planner API before ONE, and include the exact frontend origin in backend `API_ALLOWED_ORIGINS`. Code in these branches has not been promoted to production.

## Verification

- Frontend: TypeScript, full Vitest suite, production build and an architecture check rejecting direct database access or a production command engine.
- Backend: TypeScript, full Vitest suite, PGlite migrations/ownership tests, immutable file conflict tests, session validation and sample/API command tests.
- Headless Chromium against the actual local frontend and backend: native project status drag, native reorder and persistence after re-entering the sample; Markdown preview; returning from task creation to the original project; feeling selection; unified date picker and Escape; direct time-range creation.
- Viewports: 1440px desktop, 768px tablet editor, 390px phone. No page exceptions or horizontal document overflow in these flows.
- Account attachment access was verified with synthetic repository tests and PostgreSQL Storage-policy tests, without writing real users' files or requiring their credentials.

The Rednote reference was not accessible beyond its login page. Physical mobile devices and signed-in production-user mutation flows were not exercised.
