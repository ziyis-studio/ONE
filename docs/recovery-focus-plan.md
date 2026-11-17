# Task-linked focus, recovery and actual time

1. Start/resume focus from task cards and editors. Confirm before replacing a
   different unfinished session; carry task ID/title into completed history and
   its ordinary schedule block/link. Deleting a task preserves recorded titles.
2. Mark planned, actual focus and actual break blocks consistently in overview,
   month and day/week views. Keep task completion manual and recorded provenance
   distinct from editable planning fields.
3. Save account-scoped editor drafts locally with debouncing and unmount flush,
   offer explicit restore/discard and revision-conflict feedback, and clear only
   after a successful save or explicit discard. Include all editor fields.
4. Make deletions recoverable atomically on the server. Store a compact inverse
   patch, show Undo and a Settings recycle bin, restore related rows safely and
   reject conflicting later edits rather than overwriting them. Permanent removal
   stays explicit. Sample mode mirrors this behavior.
5. Export a versioned complete data backup including workspace, Pomodoro history,
   recycle-bin entries and referenced owned images, plus browser preferences.
   Validate a selected file and preview additive restoration. Preserve current
   records, keep retries idempotent and scope every cloud operation to auth.uid().

Use planner-core and canonical Planner API migrations. No privileged credentials
in clients. Verify RLS, atomic deletion/restore/import and task links with rolled-
back SQL and repository tests; exercise complete flows in local Chromium at
desktop/mobile sizes, then build and publish both repositories.

Implemented on 2026-11-17:

- A target icon on task cards, list rows, overview rows and the task editor starts
  or resumes that task's focus. Replacing another unfinished phase asks first.
  The Pomodoro card shows the linked task and lets the user unlink it.
- Editor drafts save after 450 ms and flush on close, navigation or page hide.
  Matching-revision drafts resume automatically; older revisions offer Restore /
  Discard. Drafts are browser-local and account-scoped. A failed save keeps the
  draft; successful save or explicit discard clears it.
- Deletions emit a 12-second Undo action and remain in Settings → Trash until
  restored or permanently deleted. Restoration checks identity and detached-field
  conflicts and preserves unrelated later edits. Server mutations are atomic.
- Overview and all Schedule views label planned, actual focus and actual break
  entries with distinct icons. Actual focus uses the primary-color leading edge;
  actual break uses a dashed edge. Task completion stays manual.
- Settings → Backup & restore exports v2 JSON: one consistent cloud workspace /
  session / Trash snapshot, local drafts, primary color / time zone, and owned
  private raster attachments. External image URLs remain URLs. File validation,
  relation checks and an import preview precede writes; imports add missing rows,
  retain current edits, and deterministically copy identities for other accounts.
  Legacy ONE workspace JSON is supported. Device preferences are opt-in on import.
- File limit is 50 MB, metadata request limit 3.5 MB. Active countdowns are not
  resumed from backups. Storage uploads are immutable and hash-checked; they may
  remain unreferenced if a later database transaction fails, allowing safe retries.

Verification: 124 frontend tests, 55 backend tests, TypeScript checks and production
build. SQL tests load the complete migration chain and check task links, history
immutability, deleted-task/block restoration, atomic rollback, edited recording
import, retry deduplication, owner RLS and snapshot export. The same owner-bound
operations were checked in rollback-only transactions against planner-core.
Browser rehearsal uses the production build and covers draft/Undo/Trash/backup /
Schedule flows at desktop and phone widths. Artifacts stay under ignored
`test-results/recovery-focus/`; no real account data is used in browser rehearsals.
