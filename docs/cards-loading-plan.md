# Cards, separators and page loading

Implement the thirteen browser comments while keeping the existing editing and planning behavior.

- Remove only the marked rules: calendar header, home clock/habit footers, the home task progress rule, and the old project footer.
- Make project and task card surfaces open their existing editors through a native accessible open control and background clicks. Retain inline renaming, completion checkboxes, task expansion and native task dragging without triggering an editor from those controls.
- Remove the two card action menus. Put project title beside its icon and its tag/date in the top header; metadata wraps gracefully on small cards. Remove duplicate task-lane bottom add buttons, preserving lane header add controls.
- Put the Status/Tags pair before the description, with matching label baselines and 42px control heights. Keep task project/deadline controls together below the description.
- Replace the universal six-card loading grid with route-specific structures for dashboard, task/project boards, schedule, habits, sleep, thoughts, notes and settings. Reuse actual page layout classes, maintain shell/navigation, announce loading once and disable decorative pulse for reduced motion.
- The user selected a Frame.io / Obsidian purple direction. Apply the documented Obsidian purple #7852EE, with #A882FF for dark-surface marks and focus, to primary actions, selection, progress and the short logo arc. Keep body text and large surfaces neutral; preserve both exact master arc paths. Reference: https://docs.obsidian.md/Reference/CSS%20variables/Foundations/Colors.

Verify surface opening, nested controls, keyboard activation, drag/drop and metadata preservation. Inspect loading for every route at desktop and phone widths, then run the relevant interactions, full suite and production build. Publish through the existing Git/Vercel integration.

Follow-up: derive unnamed time-block labels from their linked task names consistently in dashboard, month/week/day and search without changing stored titles. Move project-column bottom add actions to header plus icons, preserving their existing create flow.
