# Pomodoro trail, controls and timeline

- Use a normalized dash with a gap longer than the path, so a zero-length dash
  cannot repeat at the other end. Keep the elapsed trail dimmer than one explicit
  moving head. Start at O's terminal and progress counterclockwise; reset is dim.
- Move the mode icons into the card header, remove the cloud button, and put
  reset beside start/pause/resume. Keep native names, tooltips and focus behavior.
- Extend the existing completion table with its generated schedule-block link
  and time zone. An invoker-security AFTER INSERT trigger creates an ordinary
  time block in the same transaction; retries do not fire it again. Backfill
  existing completions once. The owner-scoped FK clears the link if a user
  explicitly deletes that schedule block, preserving completion history.
- Label focus and breaks distinctly, preserve actual start/end, and document
  configured work versus elapsed/pause time. Refresh the workspace quietly after
  new blocks save, with guards against racing ongoing workspace commands.
- Sample mode creates the equivalent local time block once and remembers its
  link. Preserve deadline timing, offline completion retry and all existing data.

Verify the startup head/trail and controls in Chromium, completion-to-timeline
and restart/dedup in the sample, authenticated trigger/RLS behavior with rolled-
back fixtures, and focused tests/build before publishing both repositories.
