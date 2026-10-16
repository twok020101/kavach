# 08 · Screens: screen-by-screen plan

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**Every screen in Kavach: purpose, route, layout (mobile wireframe), components, copy, data, interactions, states and acceptance criteria, plus the WhatsApp message designs (W1–W4).** Tokens and components are defined in [07-design-system.md](07-design-system.md); data shapes in [04-data-model.md](04-data-model.md); endpoints in [06-api.md](06-api.md).

Wireframes are drawn for a 360 px phone. Desktop notes follow each one. `[Button]` = button, `(chip)` = chip, `▸` = navigates, `☐` = card.

**Build order** (implementation-plan.md §2, §5): the ~12 screens in the video and the WhatsApp message designs come first (S01, S09m, S21–S24, S09, S17–S20, S30–S31, S26); the rest are Layer 3, English-only if needed. Desk and WhatsApp screens are always in Hindi too. Routes live under `apps/web/src/app/[locale]/`.

---

## 0. Sitemap and navigation

```
Public
  S01 Landing  /                           ▸ S02 Sign in  ▸ "Try the hospital scene" (demo) ▸ "Try with the Sharma family" (demo)
  S26 Proof    /proof
Auth
  S02 Sign in  /sign-in
  S03 Consent  /setup/consent
Setup (first run, owner)
  S04 Tell us about your family   /setup/family
  S05 Family card                 /setup/family/confirm
  S06 Money                       /setup/money
  S07 Documents                   /setup/documents
  S08 Smart questions             /setup/questions
App (bottom tabs on mobile; left nav on desktop)
  Home      S09 Cover map + score     /home          ── S10 Cell detail (sheet)
  Plan      S11 Plan                  /plan          ── S12 Budget sheet · S13 Partner hand-off (sheet)
  Policies  S14 Vault                 /policies      ── S15 Policy detail /policies/[id] · S16 Clause viewer (sheet)
  Timeline  S25 Timeline              /timeline
  More      S27 Settings · S28 Family access · S29 Demo controls
Moments
  M1  S17 What's changing? /change → S18 Change confirm → S19 Re-plan & diff → S20 Action review /actions/[id]
  M2  S21 Hospital start /desk → S22 Live desk /desk/[sid] → S23 Answer cards (in S22) → S24 Session summary
  M3  S30 Claims list /claims → S31 Deduction check /claims/[cid] → S32 Appeal review /actions/[id]
Member (Kamala) home
  S09m Simplified home (big "At the hospital" button, her cover, Rahul's contact)
WhatsApp (second door; message designs, not app screens)
  W1 Consent · W2 Desk reply (text + voice note + card image) · W3 Household alert · W4 Dated reminder · W5 Claim verdict
```

**App shell.** Mobile: top bar (logo, household name, language toggle, avatar) + bottom tab bar (Home, Plan, Policies, Timeline, More) + a floating marigold **"At the hospital"** pill on Home. Desktop: left nav with the same items, a persistent "At the hospital" button at the top of the nav, content max 1200 px. A thin `DisclaimerBar` sits above the bottom tabs on Plan and Desk screens.

**Global patterns.**
- Every number: tap → Why panel.
- Every fact from a document: citation chip.
- Every inferred fact: "We assumed … · change".
- Agent work: `AgentSteps` list, never a bare spinner over 1 s.
- Empty states: an illustration + one sentence + one button.
- Errors: plain sentence + retry + "Do it another way" (e.g. type instead of speak).

---

## S01 Landing (`/`)

**Purpose:** in 10 seconds tell judges and users what Kavach does, and get them into the demo.

```
┌──────────────────────────────────┐
│ ◈ Kavach            EN|हिं  Sign in│
│                                  │
│  Standing beside your family     │
│  at every insurance moment.      │
│                                  │
│  [ Try the hospital scene ]      │  ← primary, no sign-in, < 1 min
│  [ Try with the Sharma family ]  │  ← secondary, no sign-in
│  [ Start with my family ]        │  ← tertiary (link)
│                                  │
│  ☐ When life changes             │
│    "Joining a startup on 1 Dec"  │
│    → parents' cover ends 30 Nov  │
│  ☐ At the hospital  (marigold)   │
│    Hindi voice · reads the       │
│    estimate photo · ₹90,000 less │
│  ☐ When a claim goes wrong       │
│    ₹14,560 found to appeal       │
│  ☐ On a phone? Same answer on    │
│    WhatsApp  [QR]  join code     │
│                                  │
│  Every answer cited · Accuracy   │
│  NN% on 8 real policies ▸Proof   │
│  (live number from evals)        │
│  ─ Built on Gemini & Google Cloud│
└──────────────────────────────────┘
```
- `NN%` placeholders are always live engine/eval values, never typed in. The ₹90,000 and ₹14,560 on the cards come from the engine's worked examples, not typed literals.
- **"Try the hospital scene"**: anonymous sign-in → `POST /v1/public/demo?checkpoint=hospital` → S22 in text mode with the sample estimate already captured → the ₹90,000 answer, with a mic button to try voice. Works on a laptop.
- **WhatsApp card:** the Twilio sandbox QR and join code, with one line: "Send 'RAHUL' first to get the family alert on your own phone, then send the estimate photo and a voice note." The README repeats it, with the honest note on the sandbox's 3-day membership and 24-hour window.
- Desktop: two columns; right side a looping 20-second silent screen recording of the hospital scene with captions.
- Data: `/v1/public/proof` for the accuracy figure (never hard-coded).
- Acceptance: LCP < 2 s; "Try the hospital scene" reaches the ₹90,000 answer in under a minute on an Android phone and on a laptop; "Try with the Sharma family" lands on S09 with the demo household in ≤ 3 s.

## S02 Sign in (`/sign-in`)

- "Continue with Google" (Firebase Auth). Phone OTP later.
- Link: "Just looking? Try the demo family."
- Invite flow: if URL has `?invite=token`, show "Rahul invited you to the Sharma family" with language preselected (Hindi for Kamala).

## S03 Consent (`/setup/consent`)

**Purpose:** DPDP-compliant notice and consent before any personal or health data.

```
┌──────────────────────────────────┐
│ Before we start                  │
│ Kavach keeps your family's       │
│ details to give you advice.      │
│                                  │
│ ☑ Use my family, money and       │
│   policy details to plan cover   │
│ ☑ Read documents I upload        │
│ ☐ Health details (e.g. diabetes) │
│   — helps at the hospital        │
│ ☐ WhatsApp messages to my family │
│   (alerts, reminders)            │
│                                  │
│ We never sell your data. We      │
│ never contact insurers for you.  │
│ You can download or delete       │
│ everything any time.  ▸Privacy   │
│                                  │
│ [ Agree and continue ]           │
└──────────────────────────────────┘
```
- Each purpose is a separate toggle (purpose-specific consent). Health is optional; if off, health flags are not stored and the hospital mode warns that advice may be less precise.
- Saves a consent record per purpose on `users/{uid}`; timeline entry `consent`. WhatsApp consent is also asked on the first WhatsApp message from each number (W1).

## S04 Tell us about your family (`/setup/family`)

**Purpose:** one sentence (FR-H-01).

```
┌──────────────────────────────────┐
│ Step 1 of 4 ▰▱▱▱                 │
│ Tell us about your family        │
│ Who depends on you? One sentence │
│ is enough.                       │
│ ┌──────────────────────────────┐ │
│ │ I'm Rahul, 34, in Bengaluru. │ │
│ │ Wife Priya, daughter Anaya   │ │
│ │ is 5, and my parents live    │ │
│ │ with us, dad is 62 and       │ │
│ │ diabetic, mum is 58.         │ │
│ └──────────────────────────────┘ │
│        ( 🎤 Hold to speak )       │
│ Try: "Me, my husband and our     │
│ two kids in Pune"                │
│                     [ Continue ] │
└──────────────────────────────────┘
```
- Voice: hold-to-speak records up to 30 s; sent as audio to `intake:parse` (Flash understands Hindi/English directly).
- On Continue: `AgentSteps` ("Understanding your family… Found 5 people") → S05.
- Error: if no people found → "I couldn't find anyone in that. Could you say who lives with you?"

## S05 Family card (`/setup/family/confirm`)

```
┌──────────────────────────────────┐
│ Step 1 of 4 ▰▱▱▱                 │
│ Is this your family?             │
│        (S) Suresh 62   (K) Kamala 58
│         father ·diabetes  mother │
│                │                 │
│   (R) Rahul 34 ─── (P) Priya 32  │
│        you            wife       │
│                │                 │
│            (A) Anaya 5           │
│              daughter            │
│                                  │
│ We assumed: Priya isn't earning  │
│ · change                         │
│ Parents depend on you · change   │
│ [+ Add someone]                  │
│               [ Looks right ]    │
└──────────────────────────────────┘
```
- Tap any person → edit sheet: name, relation, age/DOB, earning?, dependent?, conditions (only if health consent), language.
- "We assumed" rows come from `source=inferred` facts.
- On confirm: `PUT members` → household document; S06.

## S06 Money (`/setup/money`)

```
┌──────────────────────────────────┐
│ Step 2 of 4 ▰▰▱▱                 │
│ Four numbers. Rough is fine.     │
│ Take-home pay / month            │
│ ₹1,85,000  ────●──────           │
│ All loan EMIs / month            │
│ ₹28,000    ─●────────            │
│ Household spending / month       │
│ (rent, school, groceries…)       │
│ ₹70,000    ───●──────            │
│ Savings you could use in an      │
│ emergency                        │
│ ₹4,00,000  ──●───────            │
│ ▸ Add gold (optional)            │
│ ▸ Add loan details (optional)    │
│                                  │
│ Why we ask: to suggest only what │
│ you can afford.                  │
│                     [ Continue ] │
└──────────────────────────────────┘
```
- Sliders have typed inputs; values formatted en-IN; slider ranges adapt to the first value typed.
- Inline hint under EMIs if > 50% of take-home: "That's a lot of your income. We'll keep the plan lean."
- `set-finances`.

## S07 Documents (`/setup/documents`)

```
┌──────────────────────────────────┐
│ Step 3 of 4 ▰▰▰▱                 │
│ Add what you have                │
│ Policies, your employer's        │
│ insurance summary, e-cards.      │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│   Drop PDFs or [📷 Take photo]   │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│ ☐ Acme benefits summary.pdf      │
│   ✓ Employer health cover        │
│   ✓ ₹5L family floater §2 · p2   │
│   ✓ Parents included   §2 · p2   │
│ ☐ SuperTopUp schedule.pdf        │
│   ✓ Super top-up ₹5L, ded. ₹5L   │
│   ⟳ Reading policy wording 14/42 │
│ ☐ LIC endowment.jpg              │
│   ✓ Endowment, ₹10L sum assured  │
│                                  │
│ No documents? [ Skip for now ]   │
│                     [ Continue ] │
└──────────────────────────────────┘
```
- Each file shows live `AgentSteps` from `documents/{id}.progress` (polled from the API every second while processing).
- Extracted facts appear one by one with citation chips; tapping one opens S16 (clause viewer).
- After extraction, a "Check what we found" sheet lets the user untick wrong items before confirming (`documents/{id}:confirm`).
- Wording ingest can continue in the background; Continue is allowed once schedules are read.
- Demo: sample docs pre-attached, marked "SAMPLE" in the corner.

## S08 Smart questions (`/setup/questions`)

```
┌──────────────────────────────────┐
│ Step 4 of 4 ▰▰▰▰                 │
│ Just 2 questions                 │
│ ☐ Does Priya earn?               │
│   Changes your life cover by     │
│   about ₹1.4 crore               │
│   (No) (Yes, part-time) (Yes)    │
│ ☐ Is Acme your only employer     │
│   cover? (any old policies?)     │
│   Decides if parents are safe    │
│   (Only Acme) (Have another)     │
│                                  │
│          [ See my family's cover ]│
└──────────────────────────────────┘
```
- Max 3 questions (from `GET /questions`). Each shows "why" with ₹ impact (P1).
- After answering → S09 with a one-time "reveal" animation of the cover map.

## S09 Home: cover map (`/home`)

**Purpose:** the household's safety at a glance; entry to every moment.

```
┌──────────────────────────────────┐
│ ◈ Sharma family          EN|हिं (R)│
│ ┌──────────────────────────────┐ │
│ │  ( 41 )  Safety score        │ │
│ │  ring    3 gaps · 2 depend   │ │
│ │          on Rahul's job      │ │
│ └──────────────────────────────┘ │
│ As of: 14 Oct 2026 ◀──●────────▶ │ ← timeline scrubber (pins: 30 Nov)
│          Health Life Accid Veh Dev│
│ Rahul    ◐emp   ✕    ✕   —  —   │
│ Priya    ◐emp   —    —   —  —   │
│ Anaya    ◐emp   —    —   —  —   │
│ Suresh   ◐emp   —    —   —  —   │
│ Kamala   ◐emp   —    —   —  —   │
│ Creta     —     —    —   ✓  —   │
│ iPhone    —     —    —   —  ✕   │
│  ◐ partial  ◐emp depends on job  │
│  ✓ covered  ✕ gap  — n/a          │
│ ☐ Next: 4 steps close NN% of the │
│   ₹ gap for ₹7,000/mo   ▸ Plan    │
│ ☐ Premiums: Jan spike ₹21,500 ▸  │
│ [ ＋ What's changing? ]           │
│              (🏥 At the hospital) │ ← marigold floating pill
└──────────────────────────────────┘
```
- Grid: rows = members then assets; columns = risks relevant to the household (hide all-n/a columns). Cells use `CoverCell` with icon + short label; ₹ gap shown on tap or on desktop inline.
- Timeline scrubber: drag to any date → `plans:preview {asOf}` (debounced 250 ms) → cells animate. Pins for known future events (GMC end, renewals, planned changes).
- Desktop: score card and next-steps on the right column; grid larger with ₹ inline.
- States: loading (skeleton grid), empty (no members → setup), stale plan (recomputing badge).
- Acceptance: tap any cell → S10 within 100 ms (data already loaded).

## S10 Cell detail (sheet)

```
┌──────────────────────────────────┐
│ Suresh · Health          ◐ Partial│
│ Needs        ₹10,00,000          │
│ Has          ₹5,00,000 (shared)  │
│  Employer  Acme GMC  ₹5L floater │
│            ends with Rahul's job │
│            §2 · p2 ✓             │
│  Personal  Super top-up ₹5L      │
│            starts after ₹5L      │
│            §1.3 · p3 ✓           │
│ Why it matters: a heart          │
│ procedure for a 62-year-old      │
│ averages ₹3–4 lakh.* (*cite src) │
│ [ See the fix in your plan ]     │
│ ▸ How we worked this out (Why)   │
└──────────────────────────────────┘
```
- "How we worked this out" expands the `WhyPanel` with rule IDs (R-HL-011, R-HL-012, R-HL-013) and sources.
- Any population statistic shown must carry its source (P2).

## S11 Plan (`/plan`)

```
┌──────────────────────────────────┐
│ Your plan                        │
│ Fits ₹10,425/mo budget ▸ how     │
│ Uses ₹7,000/mo · closes NN% of   │
│ the ₹ gap                        │
│ ☐ 1 Term life for Rahul  ₹4 Cr   │
│     ~₹4,000/mo · closes ₹3.7 Cr  │
│     Illustrative          [Next ▸]│
│ ☐ 2 Family health ₹10L           │
│     Rahul, Priya, Anaya ~₹1,833  │
│ ☐ 3 Accident cover ₹50L ~₹417    │
│ ☐ 4 Phone protection ~₹750       │
│ ─ Later ─                        │
│ ☐ Parents' own health ₹5L        │
│   Covered by Acme for now.       │
│   Urgent if Rahul changes jobs.  │
│ ─ Things to review ─             │
│ ☐ LIC endowment: mainly savings, │
│   life cover ₹10L ▸ why          │
│ Premium calendar ▁▂▁▇▁▁▂▁▁▁▂▁   │
│ Set aside ₹14,000/mo             │
└──────────────────────────────────┘
```
- Plan item → detail sheet: what it covers, why this size (rule trace), indicative premium (`IllustrativeBadge`), "Talk to a licensed partner" → S13.
- Budget link → S12.
- No product names anywhere (P5).

## S12 Budget sheet
Shows R-BG-001 in plain words with the numbers: "You have ₹87,000 left each month after EMIs and spending. We suggest using up to 20% (₹17,400) on protection. You already pay ₹6,975, so ₹10,425 is free." Sliders for the 20%/10% params → `change-assumption`.

## S13 Partner hand-off (sheet)
"Kavach doesn't sell insurance. A licensed partner can show you real quotes for: Term life ₹4 Cr for Rahul." `[Continue to partner]` (hackathon: opens an illustrative page with "Demo — no real purchase"). Shares only what the user ticks.

## S14 Policies vault (`/policies`)

List grouped by person, then by layer. Each row: insurer, type, SI, renewal date badge, status (`active`, `ending 30 Nov`, `planned`), document count. `[+ Add a document]`. Filters: Health, Life, Motor, Device, Travel.

## S15 Policy detail (`/policies/[id]`)

```
┌──────────────────────────────────┐
│ ← Super top-up                   │
│ Sample Insurer B · UIN XXXX      │
│ Covers: all 5 · ₹5L above ₹5L    │
│ Renews 14 Jun 2027 · ₹14,200/yr  │
│ ── Key terms (from the wording) ─│
│ Room rent      1% of SI/day ✓ §4.2.1│
│ Co-pay         None         ✓ §5.1 │
│ Deductible     ₹5L per year ✓ §1.3 │
│ PED waiting    36 months    ✓ §7.1 │
│ Cumulative bonus 10%/yr     ◐ §6.2 │
│ ...                              │
│ ▸ Open full document             │
│ ▸ Ask about this policy          │
└──────────────────────────────────┘
```
- Badges: ✓ verified, ◐ partly checked (tap for reason), "not found in wording".
- "Ask about this policy" → AdvisorAgent chat sheet (cited answers only).

## S16 Clause viewer (sheet, from any citation chip)

```
┌──────────────────────────────────┐
│ §4.2.1 Room rent · page 14   ✕   │
│ "Room rent up to 1% of the Sum   │
│  Insured per day…"  (serif)      │
│ ┌─────── page image ──────────┐  │
│ │   ███ highlighted box ███   │  │
│ └─────────────────────────────┘  │
│ Sample Insurer B · Super Top-up  │
│ Checked by Kavach ✓ (verifier)   │
│ [ Open page in document ]        │
└──────────────────────────────────┘
```

---

## Moment 1: life change

### S17 What's changing? (`/change`)

```
┌──────────────────────────────────┐
│ What's changing?                 │
│ ┌──────────────────────────────┐ │
│ │ Joining a startup on 1 Dec   │ │
│ └──────────────────────────────┘ │
│ ( 🎤 )                           │
│ Common changes:                  │
│ (New job) (Baby on the way)      │
│ (Parents moving in) (New car)    │
│ (Trip abroad) (New home loan)    │
│                       [ Check ]  │
└──────────────────────────────────┘
```

### S18 Change confirm (sheet)

```
┌──────────────────────────────────┐
│ Here's what I understood         │
│ • Rahul leaves Acme on 30 Nov    │
│ • Joins a startup on 1 Dec 2026  │
│ • Acme health cover ends 30 Nov  │
│   for all 5 of you   §2 · p2     │
│ Does the startup give health     │
│ cover?  (Yes, I have details 📎)  │
│         (Yes, don't know details)│
│         (No / not sure)          │
│ [ Edit ]          [ Looks right ]│
└──────────────────────────────────┘
```
- Asks at most one clarifying question if the change set has `needsConfirmation`.

### S19 Re-plan and diff (`/change/[planId]`)

```
┌──────────────────────────────────┐
│ On 1 Dec, your parents lose cover│
│ As of: ◀────────●30 Nov│1 Dec ─▶ │ ← scrubber auto-plays to 1 Dec
│          Health                  │
│ Rahul    ◐ startup ₹3L           │
│ Priya    ◐ startup ₹3L           │
│ Anaya    ◐ startup ₹3L           │
│ Suresh   ✕ gap  (pulse)          │
│ Kamala   ✕ gap  (pulse)          │
│ Score  41 → 29 without action    │
│ ── Your new plan ──              │
│ + Parents' own health ₹5L        │
│   via moving from Acme's policy  │
│   ~₹4,167/mo                     │
│ − Phone protection (later)       │
│ ₹7,000 → ₹10,417/mo (fits)       │
│ ── Before 30 Nov ──              │
│ ☐ By 15 Nov  Ask to move your    │
│   parents to an individual policy│
│   [Review letter]                │
│ ☐ 1 Dec  Send family details to  │
│   startup HR  [Review email]     │
│ ☐ 30 Nov reminder [Add to calendar]│
└──────────────────────────────────┘
```
- Scrubber animates from today to 1 Dec on load (400 ms stagger on changed cells).
- Score values come from the engine (do not hard-code).
- Desktop: map left, diff and actions right.

### S20 Action review (`/actions/[id]`)

```
┌──────────────────────────────────┐
│ Ask to move your parents to an   │
│ individual policy       due 15 Nov│
│ To: Acme HR / Insurer A          │
│ ┌──────────────────────────────┐ │
│ │ Subject: Request for migration│ │
│ │ of group health cover to an   │ │
│ │ individual policy — Suresh &  │ │
│ │ Kamala Sharma                 │ │
│ │ Dear Sir/Madam, I am leaving  │ │
│ │ Acme Software on 30 Nov 2026  │ │
│ │ (employee ID [____])… under   │ │
│ │ clause §9.1 of the group      │ │
│ │ policy…                       │ │
│ └──────────────────────────────┘ │
│ Highlighted = filled from your   │
│ family details. [____] = please  │
│ fill.                            │
│ ▸ Why this step (clauses, rules) │
│ [ Edit ]  [ Approve ]            │
│ After approving: Copy · PDF ·    │
│ Open in email                    │
└──────────────────────────────────┘
```
- Approve renders a PDF and marks the action approved. Kavach never sends (P4).

---

## Moment 2: hospital desk (hero)

### S21 Hospital start (`/desk`)

Reached from the marigold pill (owner) or the big button (member home). Switches to **desk theme**.

```
┌──────────────────────────────────┐
│ अस्पताल में मदद      EN|हिं  ✕   │
│ कौन भर्ती हैं?                     │
│ ┌──────────────┐┌──────────────┐ │
│ │ (S) सुरेश     ││ (K) कमला     │ │
│ │ पिताजी, 62   ││ माँ, 58      │ │
│ └──────────────┘└──────────────┘ │
│ ┌──────────────┐┌──────────────┐ │
│ │ (R) राहुल     ││ (P) प्रिया    │ │
│ └──────────────┘└──────────────┘ │
│ [   बात शुरू करें  🎤   ]  64px    │
│ Microphone and camera will be    │
│ used only while you're here.     │
│ App not working? WhatsApp करें ▸ │
└──────────────────────────────────┘
```
- Requests mic permission on tap (with explanation first). Camera permission requested only when needed.
- Creates session (`POST desk/sessions`) and opens the WebSocket. If the response says `mode: "text"` (daily live-minutes ceiling), opens S22 in text mode with a short banner.
- The WhatsApp link opens a chat with Kavach's number (the fallback door).

### S22 Live desk (`/desk/[sid]`)

```
┌──────────────────────────────────┐
│ सुरेश जी · कवच सुन रहा है    ⋯  ✕ │
│                                  │
│            ( ◉ orb )             │
│                                  │
│ आप: "पापा की एंजियोप्लास्टी       │
│ सोमवार को है"                      │
│ कवच: "अस्पताल का एस्टिमेट कैमरे    │
│ के सामने दिखाइए।"                  │
│ ✓ Reading the estimate           │
│ ⟳ Checking your policies         │
│                                  │
│ [ 📷 एस्टिमेट दिखाएँ ]  [ ⌨ लिखें ] │
│ [ 🔇 ]                           │
└──────────────────────────────────┘
```
Camera state (after tapping the camera button):
```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │
│ │  camera preview with a       │ │
│ │  document frame guide        │ │
│ └──────────────────────────────┘ │
│ "पूरा पेज फ्रेम में रखिए"           │
│ [ ◯ फ़ोटो लें ]   [ वापस ]          │
└──────────────────────────────────┘
```
- The live session is **audio only**: the camera preview stays on the phone and nothing is streamed while it is open. The capture button sends a full-resolution still (`captures` endpoint) to the estimate reader, whose result the agent receives as a tool result.
- After reading: the parsed estimate appears as a compact list (room categories with rent/day, days, total per category) with "Looks right?" (tap any line to correct). If the numbers don't add up (`needsConfirmation`), the list asks for confirmation before any answer.
- Text mode (`⌨`) uses the same screen with a text box instead of the orb; same cards.
- Captions always visible; agent line bold. Orb states per 07 §7.
- `⋯` menu: switch language, text mode, end session.

### S23 Answer cards (inside S22, stacked below captions; scrollable)

```
┌──────────────────────────────────┐
│ ☐ 1 पहले यह कार्ड दें              │
│   पेरेंट्स पॉलिसी (Insurer A)      │
│   सुपर टॉप-अप ₹5 लाख के बाद       │ ✓ §1.3
│ ☐ 2 कमरा                          │
│   ₹9,000 वाला कमरा: ₹1,50,800    │
│   ₹5,000 वाला कमरा:  ₹60,800     │
│   बचत ≈ ₹90,000 ◀ big, green      │ ✓ §3.2
│ ☐ 3 डेस्क से पूछें                  │
│   • ₹5,000 का कमरा मिलेगा?        │
│   • कैशलेस अप्रूवल शुरू करें       │
│ ☐ ⚠ साइन करने से पहले TPA डेस्क से │
│   पक्का कर लें                     │
│ ▸ क्यों? (Why panel)              │
│ [ परिवार को भेजें ] (share text)   │
└──────────────────────────────────┘
```
- Cards render instantly with ✓ taken from the engine trace (`DeskCard.verified`); no verifier call sits on the live path. A card whose numbers did not all come from the engine is never shown.
- "Compare rooms" control on card 2: enter another room rate → `:evaluate` → numbers update (the engine also runs in the browser, so this is instant).
- **Billing branch card** (when the estimate doesn't show whether charges change with the room, R-HL-010): "पहले डेस्क से पूछें: क्या ₹5,000 वाले कमरे में डॉक्टर और ऑपरेशन के चार्ज कम हैं?" with two buttons, हाँ / नहीं, and both answers shown small until tapped (₹90,000 vs ₹16,000 difference). Package rate (R-HL-014): "₹5,000 वाले कमरे का पैकेज रेट पूछें".
- **Why panel** for card 2: the tariff columns highlighted (which heads change with the room), "deduction applies because these charges change with the room", the ₹90,000 split (₹66,000 lower bill + deduction and room excess avoided − higher co-pay), the branch line "₹16,000 if the hospital doesn't price by room", clause and rule IDs (R-HL-001, R-HL-008, R-HL-010).
- Super top-up: one spoken line only, no card.
- Share builds a plain-text summary; the OS share sheet opens (user sends it).
- Acceptance: the full Sharma hero flow (start → speak → capture → 3 cards) runs in under 60 seconds on a mid-range Android phone on 4G, and every spoken rupee amount matches a card.

### S24 Session summary
After "End": a summary card (EN + HI), saved to the timeline, with a link "If a claim is later reduced, upload the letter here" → S30. Shows "Rahul has been told" once the household alert (W3) is sent; the owner's view of the session opens from the alert's link.

### S09m Member home (Kamala)
```
┌──────────────────────────────────┐
│ नमस्ते कमला जी                    │
│ [ 🏥 अस्पताल में मदद ] (marigold,  │
│   full width, 96px)              │
│ आपका कवर                          │
│ ✓ स्वास्थ्य: पेरेंट्स पॉलिसी ₹5 लाख │
│   + सुपर टॉप-अप ₹5 लाख           │
│ राहुल को कॉल करें 📞               │
│ ऐप न चले तो WhatsApp पर भेजें 💬   │
└──────────────────────────────────┘
```

---

## Moment 3: claim appeal

### S30 Claims (`/claims`)
List of claim cases with status chips; `[ + Upload a claim letter ]` (camera or PDF). Letters forwarded on WhatsApp (W5) appear here too.

### S31 Deduction check (`/claims/[cid]`)

```
┌──────────────────────────────────┐
│ Suresh · angioplasty · Feb 2027  │
│ Billed ₹2,80,000  Paid ₹2,04,640 │
│ Up to ₹14,560 may be recoverable │
│ ☐ ✕ Proportionate deduction      │
│     ₹9,600  Challengeable        │
│     Room was ₹5,000 = within 1%  │
│     limit  §4.2.1 ✓              │
│ ☐ ◐ Consumables ₹8,600 Possibly  │
│     Ask for the clause §8.4 ◐    │
│ ☐ ✓ Non-payable items ₹6,000     │
│     Valid (on the list)          │
│ ☐ ✓ Co-pay 20% ₹51,160 Valid     │
│ [ Draft the appeal letter ]      │
└──────────────────────────────────┘
```
- Colour here: challengeable uses `--status-gap` (money lost), valid uses `--status-na` (nothing to do), possibly uses partial.

### S32 Appeal review (`/actions/[id]`, kind grievance_letter)
Same layout as S20, with the escalation ladder below: "1. Insurer's grievance officer (now) → 2. Bima Bharosa portal (if no reply in [VERIFY] days) → 3. Insurance Ombudsman (within 1 year)". Approve → PDF, copy, email.

---

## WhatsApp message designs (second door)

The same agent and engine as the app. Messages are short; the detail is in the card image and the link. Hindi for Kamala, English for Rahul (from `Member.language`). Copy stays on insurance only.

### W1 Consent (first message from a number)
```
Kavach ▸ नमस्ते! मैं Kavach हूँ, आपके परिवार की बीमा सहायक।
         आपकी फ़ोटो और आवाज़ सिर्फ़ जवाब देने के लिए पढ़ी जाती है,
         फिर हटा दी जाती है। आगे बढ़ने के लिए HAAN लिखें। ▸Privacy
```

### W2 Desk reply (Kamala sends a voice note + estimate photo)
```
Kamala ▸ 🎤 0:12  "पापा की एंजियोप्लास्टी सोमवार को है, कौन सा कमरा लें?"
Kamala ▸ 📷 estimate photo
Kavach ▸ ⟳ एस्टिमेट पढ़ रहा हूँ…
Kavach ▸ 🔊 0:18  (Hindi voice note: the engine's `say` line)
Kavach ▸ [card image: ₹9,000 कमरा ₹1,50,800 · ₹5,000 कमरा ₹60,800 · बचत ₹90,000 ✓]
Kavach ▸ ₹5,000 वाला कमरा माँगिए। साइन करने से पहले TPA डेस्क से पक्का करें।
         पूरा कार्ड: kavach.app/c/…
```
- If billing is unknown, the reply asks the one desk question first, with quick replies "हाँ, अलग है" / "नहीं, एक जैसा है".
- Card image: `WhatsAppCard` (07 §8), rendered from the same `DeskCard` data.

### W3 Household alert (to Rahul)
```
Kavach ▸ Mummy is at City Heart Hospital. Kavach told her to ask for the
         ₹5,000 room. Tap to see.  ▸ kavach.app/desk/…
```
Meta template `household_alert` (variables: hospital, room); in the Twilio sandbox only inside Rahul's own 24-hour window, otherwise shown in the app.

### W4 Dated reminder (job change)
```
Kavach ▸ 15 Nov: ask Acme HR to migrate Mummy and Papa's cover.
         The letter is ready, reply YES to send it to you as a PDF.
Rahul  ▸ YES
Kavach ▸ 📄 Migration-request-Acme.pdf
```
Meta template `dated_reminder` (variables: date, action).

### W5 Claim verdict (Rahul forwards the settlement letter)
```
Rahul  ▸ 📷 settlement letter
Kavach ▸ [card image: Up to ₹14,560 may be recoverable · 2 deductions to challenge]
Kavach ▸ The ₹9,600 "proportionate deduction" is challengeable: the room was within
         the limit. Appeal letter attached; review it before you send it.
Kavach ▸ 📄 Appeal-letter.pdf
```

Acceptance: from a fresh phone that joined the sandbox, W2 arrives (voice note + card) within ~20 s, and W3 reaches Rahul's number.

---

## Other screens

### S25 Timeline (`/timeline`)
Vertical list of timeline entries, newest first, grouped by month: icon, one-line summary ("Rahul joined a startup · parents' cover changed"), who/what caused it (you said / from a document / Kavach), tap → details with before/after. Future events above a "Today" divider. Filter chips: Changes, Documents, Hospital, Claims.

### S26 Proof (`/proof`)
Public. Headline: "How accurately Kavach reads real policies". Big number (overall field accuracy), dataset size stated honestly ("8 wordings"), date, model. Bar chart per field; citation accuracy; abstention; verifier catch rate; engine agreement 100%; spoken-amount check from the rehearsal recordings. "Method" accordion; link to `evals/` in the GitHub repo. Honest notes on weak fields.

### S27 Settings
Language; text size; theme; consents (toggle per purpose); download my data; delete household (typed confirmation); about and disclaimers.

### S28 Family access
List of logins with role; "Invite family member" → choose person (e.g. Kamala) → language → QR code + link to share. Members can be removed by the owner.

### S29 Demo controls (demo households only; hidden behind `⋯ → Demo`)
Checkpoints: Setup (14 Oct 2026) · Job change (10 Nov 2026) · Hospital (8 Feb 2027) · Claim (2 Mar 2027). "Reset demo". Demo clock badge visible in the top bar when not today ("Demo date: 8 Feb 2027").

---

## Screen ↔ requirement ↔ endpoint map

| Screen | Requirements | Endpoints |
|---|---|---|
| S01 | FR-P-04 | `public/demo`, `public/proof` |
| S04–S05 | FR-H-01, 02, 07 | `intake:parse`, `PUT members` |
| S06 | FR-H-03 | `PUT finances` |
| S07 | FR-H-04, 05 | `documents` (multipart), `GET documents/{id}` (polled) |
| S08 | FR-H-06 | `questions`, `answers` |
| S09–S10 | FR-H-08, 09, 12 | `GET households/{hid}`, `plans/current`; `plans:preview` |
| S11–S13 | FR-H-10 | `plans/current`, `recommendations/{id}:handoff` |
| S14–S16 | FR-H-15 | `GET households/{hid}`; `clauses/{id}` |
| S17–S20 | FR-L-* | `life-changes:parse`, `life-changes`, `actions/*` |
| S21–S24 | FR-D-* | `desk/sessions`, WS `live`, `captures`, `turns`, `:evaluate`, `:end` |
| W1–W5 | FR-W-*, FR-D-14 | `/v1/whatsapp/meta`, `/v1/whatsapp/twilio`, `app/api/og/card/[cardId]` |
| S30–S32 | FR-C-* | `claims`, `:draft-appeal`, `actions/*` |
| S25 | FR-H-11 | `timeline` |
| S26 | FR-P-01 | `public/proof` |
| S27–S28 | FR-H-13, 16 | `invites`, `export`, `DELETE household` |
| S29 | FR-P-04 | `demo:clock`, `demo:reset` |
