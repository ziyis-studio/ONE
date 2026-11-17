# ONE UI/UX review

Reviewed all nine real app routes in local Chromium at 1703×1000 and 390×844,
with additional theme interaction checks at 921×764. Used sample workspace data;
this is not an audit of credentialed production records or physical touch devices.

## Addressed in this release

- Solid primary-color selection with white labels throughout navigation, tabs,
  both dropdown families, calendar dates, editor options and completion controls.
  The sidebar indicator is white. Disabled actions and lower history intensities
  use neutral surfaces, without translucent accent backgrounds.
- Settings has eight presets, custom HEX validation, immediate preview, reset,
  persistence in this browser and storage-event synchronization between tabs.
  Logo, auth and favicon follow the same preference. White labels retain 4.5:1
  contrast for every accepted primary color. Invalid colors use inline feedback.
- All nine desktop and phone routes remained within the viewport and produced
  no browser runtime errors in the checks.

## Follow-ups completed

The four approved items are now implemented; see
[workflow-followups-plan.md](workflow-followups-plan.md) and the detailed checks
in [REHEARSAL.md](../src/components/REHEARSAL.md).

- ONE confirmation dialogs replace native discard/delete/reset prompts. Username
  errors appear inline. Cancel preserves drafts and restores focus.
- Views, searches, filters and calendar/history selection survive navigation for
  this workspace visit. Signing out clears this temporary state.
- Column plus controls preselect the column status. Creation saves that status
  atomically through validated API input, including Done and completion gates.
- Sleep starts with Last 30 days; month/year modes remain available, and the year
  view reveals the current selection on phones.

Additional requests are included: a white/primary three-part favicon; task deadline
entries in calendar month/week/day; direct drag-to-schedule without a creation
popup; move drag feedback; and a compact current-day date badge.

## Later option

Appearance, timezone and sidebar preferences remain browser-local, as stated in
Settings. Cross-device preference synchronization can be added separately with
an account preference record and a local startup cache.

## Current priorities — November 17, 2026

This update reviews the latest source and the current Home/Sleep/Settings flow,
building on the earlier nine-route rehearsal. It does not repeat that full audit
or inspect private production records.

The two reported color issues are fixed: heatmap selection preserves each day's
duration intensity and uses a white outline; the latest/hovered/focused overview
sleep bars use the exact configured primary color. High-duration cells retain
their primary fill because it represents data. Selection no longer overrides it.

| Priority | Improvement                  | Value and current evidence                                                                                                                                                                                                                                                                |
| -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First    | Task → focus → actual time   | Tasks can be dragged into Schedule, and Pomodoro now creates time blocks. Sessions still have no task association. Starting focus from a task and carrying its name/link into the record would complete the daily workflow. Completion should leave task status under the user's control. |
| First    | Draft recovery and undo      | Editors have discard/delete confirmation, but no draft restoration or undo/recycle bin. Settings exports workspace JSON without an import/restore flow. Add recoverable drafts and deletion first, then a validated complete-account backup/restore path.                                 |
| Next     | Planned versus recorded time | Pomodoro blocks and manual plans currently share the same timeline treatment. Mark actual focus/break records distinctly and keep planned duration separate from focused and paused duration in summaries.                                                                                |
| Next     | Account preferences          | Primary color, time zone and navigation preferences remain browser-local. Sync them to the account, with a local startup cache, so the workspace stays consistent across devices.                                                                                                         |

Use the same visual-state rule across future charts: value/intensity describes
the data; an outline describes selection; status describes saving or failure.
Keep save/retry feedback visible when actionable without filling cards with
permanent technical controls. Larger secondary text and touch targets should
be part of the next typography/accessibility pass.

Recommendation: prioritize task-linked focus and recovery before adding more
dashboard cards or animation. These improve repeated daily use and trust in
saved work. The additional features above are proposals, not implemented here.
