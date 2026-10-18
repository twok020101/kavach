# Plain register: design brief for the web UI

> 17 Oct 2026. Written for the session working on `feat/ui-polish`; it supersedes the visual decisions in [2026-10-17-ui-polish-design.md](2026-10-17-ui-polish-design.md) wherever the two disagree, and keeps that spec's screen list, usability fixes and Hindi rules. Scope: `apps/web` only. No API, schema, engine or rupee changes.

## Why

Jai reviewed three polished directions borrowed from his own portfolio site and rejected all of them with one sentence: "people should feel trusted with this application, not a spam or a scam site." Kavach reads policies and tells a family what to do with their money at a hospital desk. Everything on screen has to look like it came from an institution that will still be there tomorrow: a good bank's letter, a well-run public service. Distinctiveness comes from restraint and from the quality of the information, not from decoration.

What was approved, in the visual companion, was the "public service" register (the plain, square, no-decoration language of GOV.UK-style sites) **in Kavach's own colours**: indigo as the ink, marigold only on the hospital button. Three screens were mocked in that register (landing, home with the cover table, the hospital desk answer) and approved as "something a family would trust."

## The trust principle (read before every decision)

A screen is right when a 58-year-old who has been scammed by a phone call before would still hand it her policy. Concretely:

1. **Nothing moves unless it explains something.** No ambient animation, no gradient washes, no glows, no magnetic buttons, no scale effects, no per-word reveals, no boot theatre.
2. **Every number carries its source** in the same line of sight: a citation chip with the policy, page and rule id. A number without a chip is a bug.
3. **One accent, one job.** Marigold appears only on the "At the hospital" control. Nothing else is orange. Status colours appear only in cover cells and verdict rows, always with a word and an icon.
4. **Say what Kavach is not.** The landing page states it in a two-column table: not an insurer, not an agent, does not sell policies, does not guarantee payouts, no payments ever. Demo data is marked SAMPLE wherever it appears.
5. **No urgency devices.** No countdowns, no "only today", no exclamation marks, no badges with counts, no modals that interrupt, no notification prompts.
6. **Plain words.** Sentence case everywhere. Headings are statements, not slogans. Hindi keeps the everyday English insurance words people use (policy, room rent, TPA, cashless).

## Reconciliation with the design system (07), decided 17 Oct evening

Jai asked that Kshitij's project rules govern everything, and that where [07-design-system.md](../../plan/07-design-system.md) and this spec conflict, **07 wins on type, corner radii and page colour**. So, overriding the "Tokens", "Type" and "Controls" sections below wherever they differ:

- **Type stays as 07 §4:** Plus Jakarta Sans for headings, Inter for body, Noto Sans Devanagari for Hindi, Source Serif 4 for policy quotes, JetBrains Mono **only** in the Why panel and the Proof page (so rupee amounts are not set in mono).
- **Radii stay as 07 §5:** 6 px inputs and chips, 12 px cards, 20 px sheets and big buttons, full for avatars and the orb. Nothing is square.
- **Page colour stays as 07 §3.2:** warm sand `#FBFAF7`, primary `#2E45A0`.
- **Elevation per 07 §5:** level 0 (flat, bordered) is the default for cards; level 2 only for sheets and popovers; no level 1 "raised" cards; no accent glow.
- **Structure per 07 and 08:** the 264 px desktop left nav and the bottom tab bar; the voice orb (indigo listening, marigold speaking, breathing scale 1 → 1.06 at 1.6 s) stays on the desk; `SafetyScoreRing` stays on Home; count-ups at 600 ms; cover-map status changes cross-fade at 400 ms with the pulse ring; targets at least 48 px (64 on the desk).
- **Copy per 11 §4:** the global footer, hospital, plan, claims and sample disclaimers verbatim; no exclamation marks in hospital mode or on WhatsApp.
- **Numbers per 08:** the ₹90,000 and ₹14,560 shown on the landing page come from the engine's worked examples (`landingNumbers`), never typed into message strings.

What this spec still changes, because 07 does not require it: the colour wash and every gradient go; raised-card shadows go; the marigold glow under the hospital tab goes; words-rise headlines go; the phone bezel mock goes; pills used as decoration become 6 px chips; the `scale(0.97)` press becomes a colour change; reveals are 300 ms and 8 px; the landing page gains the statement headline, the "what Kavach is / is not" table, the trust line and the dark evidence band; citations sit beside every number.

## Tokens

Replace the current values in `apps/web/src/app/globals.css`. Names stay so components need no renaming. **Superseded in part by the reconciliation above: keep sand page, 07 radii and 07 primary; apply only the shadow, wash and citation rows.**

### Colour (light, the default and the only required theme)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page. White, not sand. |
| `--surface` | `#FFFFFF` | Cards are not raised; they are bounded by hairlines. |
| `--surface-sunken` | `#F5F3EE` | Panels, table stripes, ghost buttons, citation chips. |
| `--border` | `#DDD8CE` | Hairlines (1 px). |
| `--border-strong` | `#A39D90` | Input borders, ghost-button base. |
| `--text` | `#1C1A17` | Body. |
| `--text-muted` | `#5E6472` | Secondary, table headers, trust lines. |
| `--primary` | `#23357A` | Ink for links, rules, selected tabs, primary buttons. (Was `#2E45A0`; the darker step reads more like print.) |
| `--primary-hover` | `#0F1B3D` | Hover and the hard base under primary buttons. |
| `--primary-soft` | `#E3E8F8` | Selected rows, info panel backgrounds. |
| `--accent` | `#F4A62A` | **Only** the hospital control. |
| `--accent-ink` | `#0F1B3D` | Text on marigold; also the hard base under it is `#A86A08`. |
| `--status-*` | unchanged from 07 | Cover cells and verdict rows only. |
| `--citation` / `--citation-bg` | `#5E6472` on `#F5F3EE` with a 3 px left rule in `--border-strong` | Citation chips are quiet, not blue. |
| `--radius-sm` | `0` | Buttons, inputs, chips, panels. |
| `--radius-md` | `0` | Cards. |
| `--radius-lg` | `4px` | Only the phone-preview frame on the landing page and images. |
| `--shadow-1`, `--shadow-2`, `--shadow-accent`, `--wash` | removed | Nothing is elevated or washed. Sheets and popovers use a 1 px `--border-strong` outline. |

Dark theme: keep the existing `[data-theme='dark']` block working with the same semantics (ink becomes `#B8C4F5`, hard bases become 1 px outlines), but it is not part of this pass's acceptance. The desk mode (`[data-mode='desk']`) stays light and high contrast as it is.

### Type

| Role | Font | Loaded as |
|---|---|---|
| Everything Latin | **Public Sans** 400, 500, 600, 700, 800 | `next/font/google`, variable `--font-public` |
| Everything Devanagari | **Noto Sans Devanagari** 400, 500, 600, 700 | already loaded, `--font-noto-deva` |
| Rupee amounts and timers | **JetBrains Mono** 500, 600 | already loaded, `--font-mono`, `tnum` |
| Policy quotes | **Source Serif 4** 400 italic | already loaded, only inside clause viewers |

Remove Plus Jakarta Sans and Inter. `--font-sans` and `--font-display` both resolve to Public Sans then Noto Sans Devanagari. Scale (phone, base 17 px; desktop base 17 px):

| Style | Size / line / weight |
|---|---|
| Page title | 27 / 1.1 / 800, letter-spacing −0.02em |
| Section title | 18 / 1.2 / 700 |
| Label (table headers, eyebrow) | 11 / 1.2 / 700, uppercase, letter-spacing 0.08em, `--text-muted` |
| Body | 15 / 1.5 / 400 (desk mode: 20 / 1.5) |
| Trust line | 11.5 / 1.4 / 400, `--text-muted` |
| Big amount | 28 mono 600 (desk: 40) |

Key phrases in a page title get a 4 px underline in `--primary` (`<em>` styled, not italic). That is the only typographic emphasis beyond weight.

### Controls

- **Button:** square, 44 px min height (64 px on the desk), 700 weight, 14 px, `padding 12px 16px`. A hard 2 px base under it (`box-shadow: 0 2px 0 <base>`), which disappears as the button moves down 2 px on `:active`. Variants: primary (indigo on white text, base `--primary-hover`), hospital (marigold, ink text, base `#A86A08`), ghost (`--surface-sunken`, text ink, base `--border-strong`). No hover colour change beyond a 6% darkening.
- **Link:** `--primary`, underlined, `text-underline-offset: 3px`, 600 weight.
- **Tab bar (phone):** five equal cells, 10.5 px labels, selected cell has a 3 px top rule in `--primary`; the centre cell is the hospital control, filled marigold, label in `--accent-ink`, 800 weight. No raised circle.
- **Top bar:** 1 px hairline below; wordmark "Kavach" in 800 at 15 px in `--primary`; household name right-aligned in `--text-muted`.
- **Panel:** `--surface-sunken` with a 6 px left rule in `--primary` (info), `--status-partial` (next step with a date), `--status-gap` (something missing). Replaces coloured cards and callouts.
- **Citation chip:** as in the tokens table; text "§ Room rent limit · Parents policy, p. 14" and "R-HL-001 · IRDAI 2020".
- **Table:** 1 px row hairlines, label-style headers, status words coloured and bold with an icon; the cover map is a plain table on phones and the existing grid on desktop, same styling.
- **Input:** square, 1 px `--border-strong`, 2 px `--primary` focus ring with 2 px offset.
- **Chips (filters, language toggle):** square, 1 px hairline, `--surface-sunken` when selected.

## Motion

| Keep | Rule |
|---|---|
| Numbers settle | A rupee figure counts to its value over 0.8 s the first time it appears on Home, Plan, Claims and the landing page. Never on the desk answer, which renders complete. Reduced motion: none. |
| Sections fade up | Landing page only: 300 ms opacity, 8 px rise, once. Reduced motion: none. |
| Buttons press | The 2 px drop on `:active`. |
| Status cells change | 200 ms cross-fade. |

Dropped from the earlier polish plan: the gradient wash, elevation shadows, `scale(0.97)` presses, words-rise headlines, the raised centre button. Not adopted from the portfolio site: boot splash, dot-matrix figures, magnetic buttons, the floating island, dark sections. Two items remain optional and lowest priority, to do only if everything else is done: a thin sticky section strip on long desktop pages (Proof, Policies) and a desktop-only Ctrl K jump; both must be invisible on phones.

## The dark evidence band

One place is dark: a full-width band in `--primary-hover` (`#0F1B3D`) with white text, 11.5 px, used at the foot of the landing page and as the Proof page header. It lists, in one line each: the rules' sources (IRDAI 2024 master circular, 2020 circular), the honest wording count ("8 public wordings tested, N labelled by a person"), and the sample notice. Marigold is allowed here for the source names only. It is a footer, not a theme.

## Screens

Everything in the earlier spec's screen table still applies for structure and usability. These are the visual deltas, screen by screen.

| Screen | Delta |
|---|---|
| Shell | Hairline top bar; five-cell tab bar with marigold centre cell; desktop nav is a hairline row of underlined links with the hospital control as the only filled button. Main has 16 px side gutters on phones, a 1180 px max width on desktop. |
| S01 Landing | Title: "Your family's insurance, explained at the moment it matters." with the second clause underlined. Two buttons: hospital, ghost "How it works". The ₹90,000 moment as an info panel in four sentences, not a phone mock. The "What Kavach is / is not" two-column table. The trust line. The evidence band. No wash, no hero image. |
| S02 Sign in | White card with a hairline; brand panel on desktop becomes a plain `--surface-sunken` column with the three moments as a numbered list. |
| S09 Home | Next-step panel (partial rule) at top; the cover table; monthly spend as a mono amount with "per month across N policies"; trust line "Every cell links to the policy clause it comes from." |
| S09m Member home | Same, with the hospital button at 96 px and the person's cover as a two-row table. |
| S11 Plan | Budget as a two-cell table (used, free), no meter graphic. |
| S14 Policies | Insurer name as text, status word, key terms as a label-value table. |
| S21 Desk start | Person tiles as a two-column list of square buttons with a check word, not an icon. |
| S22/S23 Desk | No orb. Captions as hairline boxes, the user's with `--surface-sunken`. The answer: Hindi title at 18/700, body 20 px, the saving as a 40 px mono amount with the word "कम", then the citation chips, then the TPA panel, then "Why this number" (primary) and "Share on WhatsApp" (ghost). Timer in mono in the top bar. |
| S25 Timeline | A 1 px vertical rule with square markers. |
| S26 Proof | Dark evidence band as header; tables below. |
| S27 Settings | Grouped hairline rows. |

## Hindi

Unchanged from the earlier spec: every new string in both `apps/web/messages/en/*.json` and `apps/web/messages/hi/*.json`; `lang="hi"` on Hindi content; Devanagari lines get 10% more line height. Hindi headings use Noto Sans Devanagari 700, never a serif.

## Accessibility

Contrast is already proven for the token pairs kept from 07. New pairs to check: white on `#23357A` (10.9:1), `--accent-ink` on marigold (8.3:1), `--text-muted` trust lines on white (5.7:1). Focus rings on every control. Target sizes as in 07 (48 px, 64 px on the desk).

## Out of scope

New features, API changes, the proof page's charts, WhatsApp card images, the dark theme's acceptance, and anything that changes a rupee figure.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm build`; screenshots of landing, home, desk answer, policies and proof at 390 px and 1366 px in English and Hindi; a keyboard pass on the shell and desk; the "would she hand it her policy" read-through of every screen against the six trust rules above.

## Landing exception, 17 Oct late evening

Jai asked, after seeing his portfolio site again, for Kavach's landing page to open the way that site does and to carry "a lot of UI/UX animation", while still giving someone in a panic "a calm feeling of safety, like an elder brother who knows what to do". So the **landing page only** (`/`, `/en`, `/hi`) now has:

- an opening on a first visit in a tab (`components/kavach/boot.tsx`): the shield draws itself, three quiet lines say what is already in place, the panel lifts; about 2.5 s, skipped by a tap, by reduced motion and on every repeat visit; never on app or hospital routes;
- a statement whose words rise, sections that rise in order, two slow colour fields behind the opening section, a soft pointer light, the sample family appearing one person at a time, and the hospital moment told in three self-advancing frames with the ₹90,000 counted up.

The trust rules still govern how it moves: slow, no glows, no urgency, nothing that interrupts, marigold only on the hospital control and the shield. Every app screen, the desk above all, stays as this spec says: still.

## Addendum, 17 Oct 2026 evening: controls

Solid buttons (primary, secondary, hospital) now use the hard 2 px base that §Button above describes: `box-shadow: 0 2px 0 <base>`, gone as the button moves down 2 px on `:active`; on a mouse the button lifts 1 px on hover. Ghost and soft buttons, chips, rows and cards keep the 160 ms `scale(0.97)` press from the design skills. Text fields take the primary border and a 3 px soft halo on focus; checkboxes, radios and the "as of" slider are drawn in the brand. Loading blocks shimmer; the theme toggle turns the moon into the sun; the active nav tab slides. All of it is transform, opacity and box-shadow; reduced motion keeps colour changes only.
