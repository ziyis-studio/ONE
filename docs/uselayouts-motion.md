# useLayouts motion in ONE

Source: [iurvish/uselayouts](https://github.com/iurvish/uselayouts), MIT,
Copyright © 2025 Urvish Mali. The upstream license is retained in
[licenses/uselayouts.txt](licenses/uselayouts.txt).

The approved first ten interactions are adapted to ONE's real workspace records,
existing command API, Lucide icons and CSS. The upstream demo content and fake
save timers are replaced with controlled inputs and actual request results.
No additional runtime dependency or database migration is required.

| Upstream example | ONE implementation | Behavior |
| --- | --- | --- |
| `bento-card` | Dashboard Thoughts + `ContentSwitch` | Recent / Linked within one card; retained header and smooth body transition |
| `client-card` | `ProjectCard` | Summary expands into real tasks; actual completion ratio draws along ONE's two master arcs |
| `animated-collection` | Tasks / Projects / Notes | Scoped layout identities, retained item movement, filter exits, board/list changes and note rearrangement |
| `discrete-tabs` | `DiscreteTabs` | Shared selection surface in view controls and habit history presets; labels stay readable |
| `create-menu` | Shell Create + `MorphMenu` | Create button surface becomes the existing seven editor actions |
| `save-button` | `SaveButton` + Editor | Saving waits for `execute`; success then closes; failures preserve the draft; duplicate submission is blocked |
| `inline-edit` | `InlineTitle` + `useActions.rename` | Task, project and note titles edit in place, with revision captured on entry and preserved metadata/links |
| `day-picker` | `DayPicker` | Repeat summary expands to ISO weekday multi-select and day presets; existing Never end remains |
| `filter-interaction` | `FilterPicker` | Project filtering for Tasks and status filtering for Projects, with a persistent selected summary |
| `smooth-dropdown` | Account and card `MorphMenu` | Shared surface morph, anchored portal, keyboard navigation, outside and Escape dismissal |

Each source example is at
`https://github.com/iurvish/uselayouts/blob/main/registry/default/example/<name>.tsx`.

## ONE adjustments

- White and gray ink, neutral opaque surfaces. Progress uses the supplied 26°
  geometry. Editor pending/success indicators reuse the login mark.
- Springs settle at stiffness 380 / damping 34. Content fades take 140–240ms.
  Menu item stagger is capped. Only a real pending save runs a loader.
- OS reduced motion, including preference changes while open, removes travel,
  springs and staggers. States and controls remain usable.
- Menu portals avoid board/dialog clipping, fit the viewport, stay anchored when
  the document scrolls and close when their trigger leaves view. Arrow keys,
  Home/End, Enter, Escape and Tab work. Opening an editor transfers focus to it.
- Rename captures its original save handler/revision; a concurrent change is
  rejected by the existing API instead of silently overwriting it. Renaming a
  note preserves its content, tags, and incoming/outgoing links.
- Pending editor submissions freeze form fields to prevent changes disappearing
  into an earlier request. Empty required values get inline feedback; optional
  thought and schedule titles remain optional.

The second-batch Delete Button, Bottom Menu and Set Timer are outside this change.

## Verification

Unit and interaction tests cover menu focus/dismissal, real filters, weekday
multi-selection, rename failure/retry/revisions, note-link preservation, project
metadata, pending save deduplication, validation and optional titles. Demo-flow
tests exercise the actual command reducer and persistence.

Chromium desktop/phone rehearsal captures and reports are local under ignored
`test-results/workspace-motion/`. Real Supabase credentials are not used. The
service command contract and optimistic concurrency checks are unchanged.
