# ONE workspace polish

Implement all nine annotated comments plus chart hover feedback in the real app.

- Clock: separate rolling seconds from HH:MM with quiet spacing and a small seconds unit, removing the mismatched second colon. Keep a complete accessible time and reduced-motion behavior.
- Selects: one React Aria based monochrome component for single and multi-select fields, including all editor, database, task and settings menus. Adapt the opening rhythm of https://uselayouts.com/docs/components/smooth-dropdown; retain existing MIT notices. Preserve keyboard, typeahead, focus return, disabled fields and actual values.
- Thoughts: remove emotion selection from the editor while preserving any existing saved emotion. Align time, dot and rule with shared grid dimensions. Remove placeholder emotion badges when there is none.
- Schedule: keep month as default. Share the day timeline with a timed week grid, preserving existing move/resize/create behavior and timezone handling. Add a right task panel; drop tasks into existing blocks without losing other task/occurrence links or rewriting block times. Also allow planning a new block with a task, including a keyboard/touch path.
- Page chrome: show today's weekday/date above all main module headings; move sidebar toggle to the top workspace toolbar, following the main-content trigger placement in https://ui.shadcn.com/docs/components/base/sidebar. Remove the homepage decorative footer.
- Charts: one positioned tooltip for sleep bars, habit/sleep heatmaps, small habit history and progress. Real dates, net durations/completion state, keyboard focus and restrained motion; remove native title bubbles from these data marks.

Verify data persistence, linked blocks, duplicate drops, week time placement, cancelled drags, dropdown keyboard/focus/validation, all module headings, clock alignment and hover placement. Review desktop, narrow desktop and phone layouts, then run relevant tests, the full suite and production build. Push the reviewed commit and verify its Vercel production deployment.
