# ONE workspace motion

Approved scope: the first ten useLayouts interactions, adapted to ONE's neutral
palette and supplied two-arc mark. Keep live records, existing commands, and
optimistic concurrency. No schema changes or new animation runtime.

1. Bento Card: Home thoughts switch Recent / Linked inside one stable card.
2. Client Card: real project completion, with its summary expanding into tasks.
3. Animated Collection: retained cards animate layout and filter changes in Tasks,
   Projects and Notes; view switches remain deliberate and fast.
4. Discrete Tabs: shared selection background, readable labels; calendar, board,
   note sections and habit history ranges.
5. Create Menu: global creation control expands into the existing editor actions.
6. Save Button: pending and success follow the actual request; ONE loader replaces
   generic spinners in editor submission. Failure retains the draft for retry.
7. Inline Edit: rename tasks, projects and notes; preserve all other fields/links.
8. Day Picker: expand repeat summary to actual ISO weekday multi-selection.
9. Filter Interaction: project filter expands into real selectable options.
10. Smooth Dropdown: account and card overflow menus share the same anchored
    morphing surface, keyboard handling and outside dismissal.

Use the source patterns in iurvish/uselayouts under MIT (license retained in
`docs/licenses/uselayouts.txt`). Rebuild demo state around real props and callbacks;
no fake timers stand in for saves. Keep the normal action response immediate.
Loading, selection and layout each have their own motion; avoid perpetual effects.
Keyboard and touch are first-class. Reduced motion gives complete still states.

Verify: filtering, selection/focus, view changes, actual command payloads and
failure recovery; project task expansion; multi-day/never-ending habits; no lost
note links or duplicated saves. Rehearse desktop and phone, then build and run
regressions before publishing.
