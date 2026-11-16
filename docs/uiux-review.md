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

## Prioritized follow-ups

| Priority | Observed issue                                                                                                                       | Recommended result                                                                                                                                    | Evidence                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| High     | Discard/delete/reset confirmations still use browser dialogs. The account username form also relies on native constraint validation. | One ONE confirmation component, safe cancel focus, specific action labels, and inline username feedback. Preserve existing unsaved-change protection. | `src/components/ui.tsx`, `Editor.tsx`, `Settings.tsx` still contain `window.confirm`; the username form has native `required`, `pattern`, and no custom invalid handler. |
| Medium   | Switching Tasks to List, visiting Home and returning restores Board. Calendar and project view/filter state also initialize anew.    | Remember view, filters and selected calendar date while moving between modules; optionally persist these preferences between visits.                  | The Tasks navigation sequence was reproduced in Chromium; route-local initial state in `Pages.tsx` and `Schedule.tsx`.                                                   |
| Medium   | Column header plus controls open a generic new task/project editor, regardless of column.                                            | Default the new item's status to the clicked column. Decide explicitly how creation in Done should work.                                              | Both handlers in `Pages.tsx` pass only the item kind; `Editor.tsx` initializes new work status to Active.                                                                |
| Medium   | The phone Sleep heatmap opens at January even late in the year, so recent dates are off-screen.                                      | Initially reveal the selected/current date, or offer recent 30 days / this month with the year as an overview.                                        | Phone Sleep capture `test-results/appearance/review-mobile-sleep.png` shows Jan–May for a November workspace date.                                                       |
| Later    | Appearance, timezone and sidebar preferences are saved only in this browser.                                                         | If cross-device personalization is wanted, sync a small preference object to the account while keeping a local startup cache.                         | Existing local preference storage; current Settings accurately states its browser-only scope.                                                                            |

Suggested next pass: confirmation/validation consistency first, then navigation
memory and contextual column creation, followed by the mobile history view.
