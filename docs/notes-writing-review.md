# Notes writing and workspace review — 26 November 2026

Notes now open at `#/notes/new` or `#/notes/<id>` as a normal workspace page. A focus mode hides navigation while retaining an exit and save controls. Tags sit above the writing area, the focus border has rounded corners, and saving keeps the writer open. Local drafts remain distinct from saved account changes and continue to recover after a save, navigation and refresh. Opening a linked note from a task or project retains a return action and the original editor draft during that visit.

The same Markdown composer powers notes, database-record content, Task Notes and Project Notes. `/` at a paragraph start opens a searchable, keyboard-accessible menu for text, headings, lists, checklists, quotes, code, dividers, tables, images and files. URLs and ordinary paths do not trigger it. Escape dismisses commands without closing a parent dialog. Images/documents can also be attached from the toolbar, dropped or pasted. Preview supports checklists/tables, private images and downloadable files.

Uploads use the existing planner-api image/file endpoints and opaque private references. All server-side authentication, storage and validation remain in planner-api. Images retain the 5 MB limit and documents the 3 MB limit. Failed uploads retain the original text. Navigation during an upload/save is guarded. Anonymous demo uploads keep the existing sign-in boundary.

## Verification

- Production build and targeted component, routing, editor, draft, tag and existing workflow checks.
- Chromium desktop and phone: real slash typing, cursor placement before fast typing, preview, multiple saves, independent note URLs, draft recovery after refresh, focus mode, rounded focus states, and viewport bounds.
- Actual demo commands: Task/Project Notes preserve surrounding content when inserting and saving formatting. Primary routes Home, Tasks, Projects, Schedule, Habits, Sleep, Meals, Thoughts, Tags and Notes remain usable. Notes search now offers a clear action when no items match.
- An isolated browser with synthetic session responses intercepted every account API request to exercise upload bytes, failed-upload retry, navigation guard, saved references, private image rendering, document downloads and reload. No live account was created or written by that rehearsal.
- Existing API attachment repository and private-storage policy tests passed against isolated fixtures. No API source change or schema migration was needed.

## Next priorities

| Improvement                      | Why it would help                                                               | Current evidence                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Note version history             | Recover an earlier draft of a saved note without restoring a whole backup.      | Notes currently retain the latest content/revision, local unsaved drafts and Trash recovery. These do not provide a sequence of saved edits. |
| Collapse completed project steps | Keep long projects readable on a phone while keeping completed work accessible. | Project editors render all their tasks; the task board already limits recent Done cards.                                                     |
| Due/overdue task shortcuts       | Find what needs attention without scanning every board card or calendar date.   | Task filters cover status/project/search and show deadline actions, but do not expose a quick due-today/overdue view.                        |

Physical mobile keyboards and Safari/Firefox were not exercised. The private-upload browser rehearsal used intercepted account responses; existing backend attachment checks cover server isolation separately.
