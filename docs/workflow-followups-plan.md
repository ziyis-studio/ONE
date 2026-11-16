# Workspace flow follow-ups

Complete the four approved review items. Replace every native confirmation with
one asynchronous ONE alert dialog: safe initial focus, keyboard/backdrop cancel,
focus restoration, inert background, reduced motion and no retained exit layer.
Keep existing unsaved-change and revision guards. Validate usernames locally
using the current API rules and inline feedback; retain server authentication.

Remember views, searches, filters, calendar date, panels and history ranges for
this workspace visit. Drop this state on sign-out/account change, without storing
searches in persistent browser storage.

Column add controls preselect an explicit initial stage. Extend the existing
Planner API creation commands with optional validated initial stages, creating
the right state atomically. Done tasks with unmet conditions must be rejected
without creating a partial record. Reuse existing time/status fields; no schema
migration. Publish the backward-compatible backend before the frontend.

Sleep defaults to the last 30 days. Add month/year presets, matching summary
statistics, period navigation, accessible date/duration cells and keyboard
navigation. Year mode reveals the selected date inside its horizontal scroller.

Verify confirmation cancel/accept/focus and nested pickers, view memory across
navigation, every task/project creation column, completion gates and API parsing,
username validation/failure, and desktop/phone history selection. Run appropriate
interactions, both full suites and builds/typechecks before Git/Vercel publication.

Follow-ups requested during implementation: use a white long arc plus the themed
short arc in the favicon. Show task deadlines in month cells and an untimed Due
row above week/day timelines; include completed tasks with completion styling.
Dragging an open task onto empty timeline space directly saves a linked,
unnamed 30-minute block (15 minutes at the end of the day), without a creation
dialog. Existing-block drops continue to attach links. Use move drag effects,
preserve task deadlines/status, guard duplicate requests and keep the Plan button
as an explicit editor path. Give today's week/day header a compact date badge
on its neutral surface instead of filling the whole day header.
