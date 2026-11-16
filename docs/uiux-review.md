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

Additional requests are included: a white/primary two-part favicon; task deadline
entries in calendar month/week/day; direct drag-to-schedule without a creation
popup; move drag feedback; and a compact current-day date badge.

## Later option

Appearance, timezone and sidebar preferences remain browser-local, as stated in
Settings. Cross-device preference synchronization can be added separately with
an account preference record and a local startup cache.
