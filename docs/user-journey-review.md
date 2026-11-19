# ONE user journey review — 20 November 2026

## Findings addressed

| Finding                                                                            | Result                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Average wake-up jumped when records crossed noon                                   | Backend uses circular means on a 24-hour clock for both bedtime and wake-up. 11:50 and 12:10 average to 12:00; opposing times have no single average. Variation uses the shortest clock distance.       |
| Project activity stacked log, composer and linked notes into a narrow sidebar      | Wider desktop dialog; separate Log and Notes tabs; one scrollable content area with the log composer kept available. Keyboard tabs and unpublished drafts are preserved.                                |
| The Done lane grew indefinitely                                                    | Default board shows five recent completions as compact cards with completion dates. Older records remain available through disclosure, search and list view. Search includes hidden completion history. |
| Empty task descriptions repeated the same decorative sentence                      | Empty descriptions no longer add filler to task cards.                                                                                                                                                  |
| No search results offered no direct way back to the collection                     | Tasks and Projects show a Clear filters action, which resets filters and returns focus to search.                                                                                                       |
| Changing a task's status after opening it from a project discarded the return path | The editor returns to the project, including its unsaved draft, after the status update.                                                                                                                |

## Rehearsed flows

An isolated sample workspace was seeded with fourteen completed tasks, twelve project log entries, a linked note and sleep records crossing noon. Chromium desktop (1703×711) and phone (390×844) checks covered:

- Sleep clock averages and their displayed window.
- Recent Done disclosure, searching old records, reopening and clearing filters.
- New task creation, unmet completion conditions, checking a condition and completing the task.
- Global search reopening the correct completed task.
- Project draft preservation, Log/Notes switching by pointer and keyboard, note linking, log posting and reopening.
- Returning from a project task after changing its status.
- Calendar month/week/day views, annual habit heatmaps, thought creation and emotion preservation, and opening a note.
- Mobile activity tabs, composer reachability and horizontal viewport fit.

The rehearsal used the real application and stateless sample API. It did not write to production account records or send authentication emails. Account sleep aggregates were inspected read-only to confirm the reported calculation error. No schema migration is required.

## Next useful improvement

The project task list can still be long on a phone when most steps are completed. A completed-steps disclosure or Open/All filter would reduce scrolling while preserving the saved sequence and access to undo completion. This is separate from the board's Done history control.
