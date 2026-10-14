# 07 · Design system: brand, colour, type, components

**The visual and interaction language of Kavach: colour tokens (light, dark and the hospital "desk" theme), typography for English and Hindi, spacing, components, motion, iconography, voice and tone, and accessibility rules.** Screen-by-screen layouts are in [08-screens.md](08-screens.md). UX is 10% of the score and there is a separate Best UI/UX prize, so this is built to be distinctive, calm and usable by a 58-year-old under stress.

---

## 1. Design principles

| Principle | In practice |
|---|---|
| **Calm in a crisis** | Generous whitespace, one primary action per screen, no red unless something is truly missing. The hospital screen has the fewest elements of any screen |
| **Show the working** | Every number has a "Why" affordance. Citations look like a quiet, trustworthy footnote, not legal clutter |
| **The family, not the policy** | People are the primary objects (faces/initials, names, relations). Policies are attached to people, never the other way round |
| **Time is visible** | Cover changes over time; a timeline scrubber and dated badges ("ends 30 Nov") are first-class |
| **Voice-first, touch-friendly** | Big targets (min 48 × 48 px; 64 px on the desk screen), captions always on, everything reachable with one thumb |
| **Indian, not clichéd** | A warm, grounded palette (indigo, marigold, sand) and a shield motif, without stock "festival" imagery |

## 2. Brand

- **Name:** Kavach (wordmark in Latin script; Devanagari कवच used as a secondary mark on Hindi screens).
- **Logo concept:** a rounded shield formed by two overlapping arcs (one indigo, one marigold) that also read as two people side by side: "standing beside your family". Flat, works at 16 px. Deliver as SVG in `apps/web/public/brand/` (mark, wordmark, lockup, mono).
- **Tagline:** "Standing beside your family at every insurance moment." Hindi: "हर बीमा पल में, आपके परिवार के साथ।"
- **Illustration style:** simple geometric line illustrations, 2 px strokes, indigo lines with marigold accents on sand backgrounds; used only on empty states and the landing page.

## 3. Colour

All values checked for WCAG contrast (ratios computed with the WCAG 2.x relative-luminance formula; listed below). Never use colour alone to carry meaning: status always pairs colour with an icon and a word.

### 3.1 Palette (raw)

| Family | 50 | 100 | 300 | 500 | 600 | 700 | 900 |
|---|---|---|---|---|---|---|---|
| **Indigo** (primary, trust) | `#F2F4FC` | `#E3E8F8` | `#8FA3F0` | `#4560C4` | `#2E45A0` | `#23357A` | `#0F1B3D` |
| **Marigold** (brand accent, warmth) | `#FFF8EB` | `#FDEFD6` | `#F8C56B` | `#F4A62A` | `#D98B12` | `#A86A08` | `#4A2E02` |
| **Sand** (neutrals, warm) | `#FBFAF7` | `#F5F3EE` | `#DDD8CE` | `#A39D90` | `#6B665C` | `#34312B` | `#1C1A17` |
| **Green** (safe) | `#E4F3EA` | – | `#5BC48A` | – | `#1F7A4D` | – | `#173326` |
| **Ochre** (partial / contingent) | `#FDF1DC` | – | `#F0B44C` | – | `#9A5B00` | – | `#3A2A10` |
| **Red** (gap) | `#FDE8E6` | – | `#F28B7D` | – | `#B42318` | – | `#3D1D1A` |
| **Slate** (cool text, dark UI) | – | – | `#9AA0B4` | `#5E6472` | – | – | `#12141C` |

**Marigold rule:** marigold is the brand accent (logo, the hospital button, celebratory moments, highlights on the landing page). It is **never** used for status. Status "partial" uses **ochre** `#9A5B00`, a darker, browner hue, and always comes with its icon, so the two are not confused.

### 3.2 Semantic tokens: light theme (default)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--bg` | `#FBFAF7` | Page background (warm sand) | – |
| `--surface` | `#FFFFFF` | Cards, sheets | – |
| `--surface-sunken` | `#F5F3EE` | Wells, input backgrounds, table stripes | – |
| `--border` | `#DDD8CE` | Hairlines, card borders (decorative only) | 1.36:1 (decorative) |
| `--border-strong` | `#A39D90` | Input borders | 2.59:1 on bg — pair with label; inputs also get a 2 px focus ring |
| `--text` | `#1C1A17` | Body text | 16.6:1 on bg |
| `--text-muted` | `#5E6472` | Secondary text, captions | 5.7:1 on bg |
| `--primary` | `#2E45A0` | Primary buttons, links, selected states | 8.1:1 on bg; white on it 8.5:1 |
| `--primary-hover` | `#23357A` | Hover/pressed | 9.2:1 on `--primary-soft` |
| `--primary-soft` | `#E3E8F8` | Selected chips, info backgrounds | – |
| `--on-primary` | `#FFFFFF` | Text on primary | 8.5:1 |
| `--accent` | `#F4A62A` | Brand accent fills (hospital button, highlights) | text on it must be `--accent-ink` |
| `--accent-ink` | `#0F1B3D` | Text/icons on marigold | 8.3:1 |
| `--status-safe` | `#1F7A4D` | Covered | 5.3:1 on white, 5.1:1 on bg |
| `--status-safe-bg` | `#E4F3EA` | Covered cell fill | safe text on it 4.6:1 |
| `--status-partial` | `#9A5B00` | Partial / contingent | 5.4:1 on white |
| `--status-partial-bg` | `#FDF1DC` | Partial cell fill | 4.9:1 |
| `--status-gap` | `#B42318` | Gap / error | 6.6:1 on white |
| `--status-gap-bg` | `#FDE8E6` | Gap cell fill | 5.6:1 |
| `--status-na` | `#6B665C` | Not applicable | 5.5:1 on bg |
| `--status-na-bg` | `#ECE9E2` | N/A cell fill | – |
| `--focus-ring` | `#2E45A0` | 2 px ring + 2 px offset | – |
| `--citation` | `#23357A` on `#F2F4FC` | Citation chips ("§4.2.1 · p14") | 9+:1 |

### 3.3 Dark theme

| Token | Value | Contrast |
|---|---|---|
| `--bg` | `#12141C` | – |
| `--surface` | `#1A1D28` | – |
| `--surface-sunken` | `#151821` | – |
| `--border` | `#3A3F55` | decorative |
| `--text` | `#EDEBE6` | 14.1:1 on surface |
| `--text-muted` | `#9AA0B4` | 6.5:1 on surface |
| `--primary` | `#8FA3F0` | 6.9:1 on surface; `--on-primary` `#12141C` 7.6:1 |
| `--accent` | `#F4A62A` | `--accent-ink` `#12141C` 9.1:1 |
| `--status-safe` / bg | `#5BC48A` / `#173326` | 6.3:1 |
| `--status-partial` / bg | `#F0B44C` / `#3A2A10` | 7.5:1 |
| `--status-gap` / bg | `#F28B7D` / `#3D1D1A` | 6.3:1 |

Theme follows the OS (`prefers-color-scheme`) with a manual override in Settings. Implement as CSS variables on `:root` and `[data-theme="dark"]`, mapped into Tailwind v4 `@theme`.

### 3.4 Desk theme (hospital mode)

Hospital lighting is bright and people are stressed; desk mode always uses a light, maximum-contrast variant regardless of OS theme:
- Background `#FFFFFF`, text `#0B0B0C` (19.7:1), muted text `#34312B`.
- Base font size 20 px; numbers 32–40 px.
- Buttons 64 px tall, full width.
- Status colours as light theme, at 600 weights only.
- Animated "listening" orb in indigo; "speaking" orb in marigold.

### 3.5 Data visualisation colours

- Cover-map statuses use the status tokens above (with icons).
- Layers (statutory / employer / personal) in stacked bars: Slate `#5E6472` (statutory), Ochre `#9A5B00` (employer, since it's contingent), Indigo `#2E45A0` (personal). Legend always visible; direct labels where space allows.
- Premium strip: single indigo series; spike months outlined in marigold with a label.
- Proof page accuracy bars: indigo; target line dashed sand-600.

## 4. Typography

| Role | Latin | Devanagari | Notes |
|---|---|---|---|
| Display / headings | **Plus Jakarta Sans** (600, 700) | **Noto Sans Devanagari** (600, 700) | Friendly geometric, good numerals |
| Body / UI | **Inter** (400, 500, 600) | **Noto Sans Devanagari** (400, 500) | `font-feature-settings: "tnum"` for all amounts |
| Citations / clause text | **Source Serif 4** (400 italic for quotes) | **Noto Serif Devanagari** | Quotes from policy wordings feel like a document |
| Mono (IDs, rule IDs) | **JetBrains Mono** (400) | – | Only in the Why panel and Proof page |

Load via `next/font/google` (self-hosted at build, no runtime requests). Set `lang="hi"` on Hindi content so the right font and line-breaking apply. Devanagari needs ~10% more line height.

### Type scale (rem, 1rem = 16 px; desk mode multiplies by 1.25)

| Token | Size / line-height | Use |
|---|---|---|
| `display` | 2.5 / 1.1 (40 px) | Safety score number, landing hero |
| `h1` | 2.0 / 1.2 | Screen titles |
| `h2` | 1.5 / 1.3 | Section titles |
| `h3` | 1.25 / 1.35 | Card titles |
| `body-lg` | 1.125 / 1.55 | Primary reading text, agent answers |
| `body` | 1.0 / 1.55 | Default |
| `small` | 0.875 / 1.45 | Meta, captions |
| `micro` | 0.75 / 1.4 | Citation chips, legends (never below 12 px) |

Amounts: always `₹` + Indian digit grouping (`₹1,50,800`, via `Intl.NumberFormat('en-IN')`); in speech and big displays use lakh/crore words ("₹1.5 lakh", "₹4 crore"), with the exact figure on tap.

## 5. Space, shape, elevation

- **Spacing scale (px):** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Mobile page padding 16; desktop 32. Card padding 16 (mobile) / 24 (desktop).
- **Grid:** mobile single column; tablet 8-col; desktop 12-col, max content width 1200 px; app shell has a 264 px left nav on desktop and a bottom tab bar on mobile.
- **Radius:** 6 (inputs, chips), 12 (cards), 20 (sheets, big buttons), full (avatars, orb).
- **Elevation:** 0 (flat, bordered cards by default); 1 `0 1px 2px rgba(28,26,23,.06), 0 1px 1px rgba(28,26,23,.04)` (raised cards); 2 `0 8px 24px rgba(15,27,61,.12)` (sheets, popovers). Dark theme uses lighter surfaces instead of shadows.

## 6. Iconography

lucide-react, 1.75 px stroke, 20 px default (24 px on desk). Key mappings:

| Concept | Icon |
|---|---|
| Covered | `ShieldCheck` |
| Partial | `ShieldHalf` |
| Contingent on job | `Briefcase` overlay on `ShieldHalf` |
| Gap | `ShieldAlert` |
| Health | `HeartPulse` |
| Life | `Users` (income for family) |
| Accident | `Bandage` |
| Vehicle | `Car` |
| Device | `Smartphone` |
| Travel | `Plane` |
| Citation | `Quote` / `FileText` |
| Verified | `BadgeCheck` |
| Hospital mode | `Hospital` |
| Life change | `Sparkles` → avoid; use `GitBranch` (a fork in life) |
| Action / approve | `CheckCircle2`, `PenLine` |
| Voice | `Mic`, `MicOff`, `Volume2` |

## 7. Motion

Library: Motion. Respect `prefers-reduced-motion` (fade only).

| Motion | Spec |
|---|---|
| Default transition | 200 ms, ease-out `cubic-bezier(.2,.8,.2,1)` |
| Sheet open | 280 ms slide-up + fade |
| Cover-map cell status change (moment 1) | 400 ms colour cross-fade + 1 pulse ring, cells change in a left-to-right stagger of 40 ms, so the eye follows "what changed" |
| Timeline scrubber | cells interpolate as the date moves; a dated pin drops at the effective date |
| Diff reveal | added items slide in from right with a green `+`, removed fade with strike-through, budget number counts up/down (600 ms) |
| Agent step list | each step appears with a 150 ms fade; spinner → check |
| Voice orb | listening: slow breathing scale 1 → 1.06 at 1.6 s; speaking: amplitude-driven scale from output audio RMS |
| Numbers | Count-up 600 ms when first revealed; never animate when updating due to a correction |

## 8. Components (built on shadcn/ui unless noted)

| Component | Description | States |
|---|---|---|
| `Button` | primary, secondary (outline), ghost, danger, **accent** (marigold, hospital only) | default, hover, pressed, focus, disabled, loading |
| `BigActionButton` (custom) | 64 px full-width, icon + label + sub-label; used for "At the hospital" and desk actions | as Button |
| `FactValue` (custom) | renders a `Fact`: value + source badge ("from your policy", "you said", "we assumed · change") + citation chip | normal, inferred, low-confidence, editing |
| `CitationChip` (custom) | `§4.2.1 · p14` with `Quote` icon; tap opens Clause Viewer | default, verified (badge), partially verified |
| `ClauseViewer` (custom sheet) | Quote in serif; full clause; page image with highlight box; product name, UIN; "Open full document" | loading, ready |
| `WhyPanel` (custom) | Lists statements with verification badge, rule IDs and plain-English rule, clauses; collapsible | – |
| `MemberAvatar` | initials on a tinted circle (colour derived from relation), name, relation, age | default, selected, with status dot |
| `FamilyCard` (custom) | Tree layout: owner centre, spouse beside, children below, parents above | editing per member |
| `CoverMapGrid` (custom) | rows = members, columns = risks; cells show icon + status + ₹ gap; sticky first column; horizontal scroll on mobile | per cell: covered/partial/contingent/gap/na; selected; changed (pulse) |
| `CoverCell` | 88 × 72 px min (mobile 72 × 64) | as above |
| `SafetyScoreRing` | 0–100 ring with label; colour follows thresholds (≥ 80 safe, 50–79 partial, < 50 gap) | before/after split mode for diffs |
| `TimelineScrubber` (custom) | horizontal date track with event pins; drag or tap pins | – |
| `PlanItem` | recommendation row: category icon, who, size, ₹/mo, "closes ₹X gap", reason; deferred style is muted with reason | default, deferred, added, removed |
| `DiffSheet` (custom) | before → after summary with lists | – |
| `ActionCard` | title, due date badge, preview, Review → Approve | draft, approved, done, dismissed |
| `DocumentPreview` | letter/form preview with editable fields highlighted | – |
| `UploadDropzone` | drag/drop + camera capture on mobile; per-file progress with agent steps | idle, uploading, processing (steps), ready, failed |
| `AgentSteps` (custom) | vertical list of steps with spinner/check, e.g. "Reading page 14 of 42" | – |
| `ChipQuestion` | question + why ("changes your term cover by ~₹1.5 Cr") + chips | – |
| `MoneySlider` | slider + numeric input; Indian formatting; "typical for your city" marker | – |
| `VoiceOrb` (custom) | listening/speaking/thinking states; tap to mute | idle, listening, thinking, speaking, error |
| `CaptionStream` (custom) | live captions, agent lines bold, user lines muted; auto-scroll | – |
| `DeskCard` (custom) | large card: icon, title, big number, one-line explanation, citation chip, verification badge | verifying, verified, partial |
| `CameraCapture` (custom) | live preview with document frame guide; capture button; retake | – |
| `PremiumStrip` | 12 bars (months), spike outlines | – |
| `LanguageToggle` | EN / हिं segmented control | – |
| `DisclaimerBar` | thin bar: "Guidance, not a policy recommendation. Confirm with your insurer." | – |
| `IllustrativeBadge` | "Illustrative" label on any mock product/premium | – |
| `Toast`, `Dialog`, `Sheet`, `Tabs`, `Tooltip`, `Skeleton` | shadcn defaults themed with tokens | – |

## 9. Voice and tone

| Context | Tone | Example (EN) | Example (HI) |
|---|---|---|---|
| Normal | Plain, warm, specific | "Your parents are covered only through Acme. That cover ends on 30 Nov." | "आपके माता-पिता का कवर सिर्फ़ Acme की पॉलिसी से है। यह 30 नवंबर को ख़त्म होगा।" |
| Hospital | Short, calm, one step at a time | "Give the parents' policy card at the TPA desk first." | "पहले TPA डेस्क पर पेरेंट्स वाली पॉलिसी का कार्ड दीजिए।" |
| Uncertainty | Honest | "I couldn't find this in your policy. Please ask the desk." | "यह आपकी पॉलिसी में नहीं मिला। कृपया डेस्क से पूछ लीजिए।" |
| Good news | Understated | "You're covered for this." | "इसके लिए आप कवर्ड हैं।" |

Rules: no jargon without a one-tap explanation (glossary popovers); no exclamation marks in hospital mode; never "guaranteed"; numbers in lakh/crore; use "you" and the person's name; Hindi keeps everyday English insurance words (policy, room rent, TPA, cashless) as people actually say them.

## 10. Accessibility checklist (WCAG 2.2 AA)

- Contrast: all text pairs above meet ≥ 4.5:1 (body) / ≥ 3:1 (large); desk theme ≥ 7:1.
- Status never by colour alone (icon + label).
- Targets ≥ 48 px (desk 64 px); spacing between targets ≥ 8 px.
- Full keyboard navigation; visible focus ring; skip-to-content link.
- Screen reader labels for every icon button; cover map cells announce "Suresh, health: gap, needs ₹10 lakh, has none".
- Captions for all agent speech; a transcript is saved.
- Text scaling to 200% without loss (Settings: Normal / Large / Extra large).
- Reduced motion respected.
- Language attribute set per element (`lang="hi"`).
- Forms: labels always visible; errors in text, not colour only.

## 11. Tokens file (starter `apps/web/styles/tokens.css`)

```css
@import "tailwindcss";

:root {
  --bg: #FBFAF7; --surface: #FFFFFF; --surface-sunken: #F5F3EE;
  --border: #DDD8CE; --border-strong: #A39D90;
  --text: #1C1A17; --text-muted: #5E6472;
  --primary: #2E45A0; --primary-hover: #23357A; --primary-soft: #E3E8F8; --on-primary: #FFFFFF;
  --accent: #F4A62A; --accent-ink: #0F1B3D;
  --status-safe: #1F7A4D; --status-safe-bg: #E4F3EA;
  --status-partial: #9A5B00; --status-partial-bg: #FDF1DC;
  --status-gap: #B42318; --status-gap-bg: #FDE8E6;
  --status-na: #6B665C; --status-na-bg: #ECE9E2;
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px;
}
[data-theme="dark"] {
  --bg: #12141C; --surface: #1A1D28; --surface-sunken: #151821;
  --border: #3A3F55; --border-strong: #5E6472;
  --text: #EDEBE6; --text-muted: #9AA0B4;
  --primary: #8FA3F0; --primary-hover: #A9B9F4; --primary-soft: #23294A; --on-primary: #12141C;
  --accent: #F4A62A; --accent-ink: #12141C;
  --status-safe: #5BC48A; --status-safe-bg: #173326;
  --status-partial: #F0B44C; --status-partial-bg: #3A2A10;
  --status-gap: #F28B7D; --status-gap-bg: #3D1D1A;
  --status-na: #9AA0B4; --status-na-bg: #23263A;
}
[data-mode="desk"] {
  --bg: #FFFFFF; --surface: #FFFFFF; --text: #0B0B0C; --text-muted: #34312B;
  font-size: 125%;
}

@theme inline {
  --color-bg: var(--bg); --color-surface: var(--surface); --color-sunken: var(--surface-sunken);
  --color-border: var(--border); --color-text: var(--text); --color-muted: var(--text-muted);
  --color-primary: var(--primary); --color-primary-soft: var(--primary-soft); --color-on-primary: var(--on-primary);
  --color-accent: var(--accent); --color-accent-ink: var(--accent-ink);
  --color-safe: var(--status-safe); --color-safe-bg: var(--status-safe-bg);
  --color-partial: var(--status-partial); --color-partial-bg: var(--status-partial-bg);
  --color-gap: var(--status-gap); --color-gap-bg: var(--status-gap-bg);
  --color-na: var(--status-na); --color-na-bg: var(--status-na-bg);
  --radius-sm: var(--radius-sm); --radius-md: var(--radius-md); --radius-lg: var(--radius-lg);
  --font-sans: var(--font-inter), var(--font-noto-deva), system-ui, sans-serif;
  --font-display: var(--font-jakarta), var(--font-noto-deva), sans-serif;
  --font-serif: var(--font-source-serif), var(--font-noto-serif-deva), serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}
```
