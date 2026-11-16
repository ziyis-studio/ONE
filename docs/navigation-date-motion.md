# ONE navigation and date/time controls

Implement the user's navigation and picker requests together, preserving workspace data and the current monochrome design.

- Desktop: explicitly toggle between an icon rail and a labelled sidebar. Animate the grid width and label opacity without scaling page text. Persist the device preference; support Ctrl/Cmd+B outside editors. Keep the active destination moving smoothly between buttons.
- Mobile: retain the four primary destinations and expand More into an attached tray for the remaining pages. Close on selection, outside click, Escape, or desktop resize. Keep focus contained while expanded and return it on dismissal.
- Date/time: replace every visible native date/datetime input with one shared React Aria control. Use a rounded monochrome calendar, 24-hour segmented time editing, a short popover transition, keyboard navigation, and reduced-motion support. Keep canonical civil values unchanged until the existing timezone conversion at save.
- Validation: use ONE's existing inline errors, including incomplete segments and invalid ranges; never invoke browser validation bubbles. An open calendar owns Escape and Tab before the parent editor does.
- Check real navigation, persistence, all date-field locations, overnight sleep, arbitrary minutes, min dates, nested focus, mobile sizing, and reduced motion. Run the full existing test suite and production build before pushing.

References: [shadcn sidebar](https://ui.shadcn.com/docs/components/base/sidebar), [Motion layout](https://motion.dev/docs/react-layout-animations), [useLayouts bottom menu](https://uselayouts.com/docs/components/bottom-menu), [React Aria DatePicker](https://react-spectrum.adobe.com/react-aria/DatePicker.html). Adapt the interaction patterns to ONE; do not import their visual themes. Existing useLayouts MIT attribution remains in docs/licenses/uselayouts.txt and public/licenses/uselayouts.txt.
