# UI/UX polish: design

> 17 Oct 2026. Branch `feat/ui-polish`. Scope: the web app only (`apps/web`). No API, schema or engine changes.

## Why

The screens work but read as a plain component demo: flat bordered boxes, the same weight everywhere, no moment of delight, and a few real usability problems for the people in [01-product.md §3](../../plan/01-product.md). UX is 10% of the score and there is a separate Best UI/UX prize ([07-design-system.md](../../plan/07-design-system.md)).

## Who it must work for

| Person | What they need from the UI | What this pass does |
|---|---|---|
| **Rahul**, 34, tech, owner | Density on a laptop, fast scanning, the "why" one tap away | Desktop grid with the map large and the score and next steps beside it; cover cells show the ₹ gap; hover and keyboard states on everything |
| **Kamala**, 58, Hindi, WhatsApp user | One obvious button, big type, no clutter, nothing to work out | The hospital button sits in the middle of the bottom bar on every screen; a **simple home** for members who joined by invite (big hospital button, her cover, who to call); desk screens with fewer elements and bigger targets; "Extra large" text |
| **Priya**, 32, non-tech white collar | Plain language, know what to do next | A "next step" strip at the top of Home; plan rows that read as sentences; empty states that say what to do |
| **Judges** | Distinctive, calm, Indian without cliché | Warm sand page with a faint indigo/marigold wash, Plus Jakarta display type, counted-up rupee numbers, reveal-on-scroll, a landing page that leads with the ₹90,000 moment |

## Design decisions

1. **Keep the tokens, raise the craft.** Palette, fonts, radii and status rules from 07 stay. We add depth (elevation 1 by default, elevation 2 for sheets), a top-of-page gradient wash, pill chips, pressed states (scale 0.97), and `text-wrap: balance` on headings.
2. **One hero control.** The marigold "At the hospital" button moves from a floating pill (which covered the cover map on phones) to the **centre slot of the bottom tab bar**, raised, visible on every app screen. Tabs become Home · Plan · [Hospital] · Policies · More. Timeline and Claims live under More and are linked from Home. The desktop nav keeps every item and the button at the top.
3. **Motion that explains.** Rupee amounts count up the first time they appear (`Amount animate`), never on corrections. Lists and sections fade up on scroll (`Reveal`, CSS transition, `prefers-reduced-motion` → none). Status cells cross-fade.
4. **Simple home for members.** A login that joined through an invite remembers its member id on the device (`kavach.memberId`). Home then shows S09m: greeting, a 96 px hospital button, that person's health cover, "Call {alert contact}", the WhatsApp line, and a link to the full view. Owners never see it.
5. **Text size: Normal / Large / Extra large** (100 / 112.5 / 125%), applied before paint by `public/theme.js`.
6. **Every new string in English and Hindi**, in the existing per-feature message files.

## Screens in this pass

| Screen | Change |
|---|---|
| App shell | New bottom bar with centre hospital button; top bar with household chip; desktop nav with section title; main padding that clears the bar |
| S01 Landing | Hero with gradient wash, words-rise headline, big CTA, the room card framed as a phone preview with the ₹90,000 counted up; numbered "three moments" row; trust strip with the live numbers; WhatsApp card; footer |
| S02 Sign in / setup frame | Brand panel on desktop (indigo, the three moments), warmer card on phone; step progress with names |
| S09 Home | Next-step strip; score card (ring + three counts); cover map with avatars, sticky first column, ₹ gap on desktop; slimmer demo bar |
| S09m Member home | As decision 4 |
| S11 Plan | Budget meter (used vs free); rows with category icon, cover and premium aligned |
| S14 Policies | Insurer initial, status pill, key terms as chips |
| S21 Desk start | 2-up person tiles with check mark, language toggle, sticky start button |
| S22/S23 Desk | Centred orb, chat-style captions, answer cards with number badge and counted-up saving |
| S25 Timeline | Real vertical line with dots, "Today" marker |
| S27 Settings | Grouped rows; Timeline and Claims entries; three text sizes |

## Out of scope

New features, API changes, the proof page's charts, WhatsApp card images, and anything that changes a rupee figure.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm build`; screenshots of every screen at 390 px and 1366 px, light and dark, EN and HI; keyboard pass on the shell and desk; contrast spot-checks on any new colour pairing.
