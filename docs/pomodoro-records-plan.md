# Smooth motion and recorded focus

- Keep the exact three brand paths. Loading uses a continuous slow-to-fast
  acceleration across E/N/O, including a gentle entry into O; hold and fade the
  finished ring. Error colors only E red. Respect reduced motion and visibility.
- Simplify Pomodoro to mode tabs, a centered dial, start/pause, reset and a small
  daily summary. Remove the motivational heading and paragraph. Start with dim
  tracks and fill counterclockwise from the end of O, then N, then E as elapsed
  time grows. No decorative pulse competes with the actual timer progress.
- Reuse planner-core. Store completed focus/break sessions with stable UUIDs,
  owner, mode, start/end and configured duration in pomodoro_sessions. Enable
  owner-only RLS, SELECT/INSERT only, indexed owner/completion lookup, immutable
  rows and idempotent inserts. No new project or service credentials.
  Keep the migration in Planner API's canonical migration history, with its
  applied database version 20261117084448.
- The timer remains local and deadline-based; retain completed records for retry
  when offline, deduplicate retries/tabs, and merge today's cloud history with
  local results. Cloud failure never interrupts timing or changes task data.
- Preserve existing browser timer data. Demo never sends records to Supabase.
  Verify schema isolation and idempotency with rolled-back synthetic SQL, run
  focused behavior checks and the production build before publishing.
