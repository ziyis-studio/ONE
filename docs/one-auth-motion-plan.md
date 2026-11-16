# ONE authentication motion

The supplied 26° master is the source of truth. Both paths, their rounded caps,
and the two larger gaps stay intact. The entire mark never spins. The rest of
ONE receives the same updated static asset.

This is the real login screen, not a faux demo. Stageshow's `form-error` example
is the reference for a reserved feedback lane, field-local errors, and a stable
button footprint. Its framing kits and fake interaction scripts are not shipped
inside authentication. Use ONE's existing React/Motion components and real
Supabase requests. Reference only the uploaded Motion Lab's loader.

## Composition

A single, card-free column on charcoal, with a 112px mark as the focal object.
White and neutral gray only. A small wordmark anchors the header. A 400px form
adapts to a phone with 24px gutters; fields and actions have generous touch targets.
No decorative halo, colored wash, or stock loading spinner on the login form.

## State and cause

| State | Trigger | Logo and feedback |
| --- | --- | --- |
| Idle | Fresh page, or leave the form | Exact master, completely still |
| Loading | Focus a field; submitting a real request | Fade in over 500ms; 2.4s long-arc/short-arc light sweep, hold, withdrawal from Motion Lab |
| Error | Invalid field or failed request | Long arc counters the short arc's outward recoil; settle once, with a persistent actionable inline explanation |
| Success | Confirmed sign-in / password update | Long arc draws bright, short arc follows, both settle; hold before leaving for the workspace |
| Email sent | Reset / signup awaiting confirmation | The success mark settles, confirmation stays visible; no workspace navigation |

Input changes clear the relevant error. Back and mode changes cancel old visual
states and clear passwords. Disable duplicate submissions and mode switches while
pending. Never disable the whole page during a failed request.

The parent must retain Auth during SIGNED_IN until its success sequence finishes.
Restored sessions enter directly. Reduced motion uses still states and a short
confirmation hold; hidden tabs stop the animation clock. No animation timer or
frame loop survives unmount.

## Verification

Test real form interactions, custom validation in all four auth modes, server
error mapping, retry, duplicate-submit protection, and the SIGNED_IN gate. Build
and run the full regression suite. Rehearse opening, a full loading cycle, error,
success, interruption and reduced motion at desktop and phone widths. Report any
visual checks the available browser cannot perform instead of calling them passed.
