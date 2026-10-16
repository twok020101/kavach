# 01 · Product specification

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**What Kavach is, who it is for, what it must do, and how we know it works.** Read this before any other document in the plan. Every screen, table and agent in the later documents traces back to a requirement here (IDs like `FR-H-04`).

Sources: [game-plan.md](../research/game-plan.md) (adopted direction), [brief.md](../research/brief.md), [feasibility.md](../research/feasibility.md), [market-scan.md](../research/market-scan.md), [past-winners.md](../research/past-winners.md).

---

## 1. One-line pitch

**Kavach is the AI that stands beside your family at every insurance moment.** It remembers the household (people, money, every policy, the employer cover, everything that has happened) and acts at the three moments where families lose money: when life changes, at the hospital desk, and when a claim goes wrong.

Kavach (कवच) means "armour" or "shield".

## 2. The problem in three sentences

1. Indian families hold insurance they don't understand: about 45% of corporate employees have nothing beyond employer cover, and only 40% know how to keep cover across a job change (TATA AIG, Aug 2026).
2. The money is lost at specific moments: the last day at a job, the hospital admission desk (where a room upgrade can shrink the whole claim), and the claim settlement letter.
3. Nobody is there at those moments. Aggregators sell a policy and leave; advisers work by phone at office hours; the 40-page policy wording is never read.

## 3. Who it is for

| Persona | Role in product | Needs |
|---|---|---|
| **Rahul Sharma, 34, Bengaluru** (primary account owner) | Salaried, product manager, pays the premiums, sets up Kavach | One picture of what the family is actually covered for; what to do before a job change; no sales calls |
| **Kamala Sharma, 58** (Rahul's mother, family member with her own login) | Moved with Suresh from Lucknow to live with Rahul in Bengaluru, which is why she speaks Hindi there. Uses a phone for WhatsApp and YouTube, not for forms | At the hospital, in Hindi, by voice: "What do I tell them? How much will we pay?" In the app Rahul installed, or on the WhatsApp she already uses |
| **Suresh Sharma, 62** (Rahul's father, insured person) | Moved from Lucknow with Kamala. Has type 2 diabetes; the patient in moment 2 (a **planned** angioplasty) | Nothing directly; he is the reason cover matters |
| **Priya, 32, and Anaya, 5** | Spouse and daughter, insured persons | Covered continuously |

Secondary personas (used for testing, not the video): **Meera, 29, Pune**, a freelancer with no employer cover; **Arjun and Fatima Khan, 41 and 39, Delhi**, two children, a home loan and a term plan that is too small. Full persona data is in [09-demo-data-and-script.md](09-demo-data-and-script.md).

**Decision (defaulted, from the open questions in game-plan.md):** the hospital-desk hero is **Rahul's mother, Kamala**, using Kavach on her own phone in Hindi, with the household memory Rahul built earlier. The claim-appeal moment appears in the video as **one quick frame** (about 15 seconds) and in full in the live app and deck. Kshitij can overrule either; nothing in the architecture depends on it.

## 4. Product principles (non-negotiable)

| # | Principle | What it means in the build |
|---|---|---|
| P1 | **Ask only what changes the outcome by real money** | A question planner ranks unknowns by ₹ impact × uncertainty; everything else is inferred and shown as "We assumed X · change" |
| P2 | **Every claim is cited and checked** | Every statement Kavach shows about a policy links to the clause (document, page, clause id, quoted text). A verifier agent checks it before display |
| P3 | **Numbers come from rules, not guesses** | Every ₹ figure is computed by the deterministic engine ([05-rules-engine.md](05-rules-engine.md)). Gemini explains numbers; it never invents them |
| P4 | **The family decides** | Kavach prepares forms, letters, reminders and checklists. A human approves each one. Kavach messages only the household's own opted-in WhatsApp numbers (replies, the household alert, dated reminders); anything to a third party (HR, insurer, hospital) is drafted and the family sends it |
| P5 | **Guidance, not selling** | Category-level advice ("parents need their own health cover of about ₹10L"). Purchase is a hand-off card to a licensed partner, clearly marked illustrative in the hackathon |
| P6 | **Built for the whole family** | Voice-first, Hindi and English, large type, high contrast, usable by a 58-year-old under stress |
| P7 | **Honest about uncertainty** | Every hospital answer ends with "Confirm with the TPA/insurance desk". Low-confidence facts are visibly marked |
| P8 | **Every fact remembers where it came from** | `said`, `document`, `inferred`, `aa`, `insurer_api`, `rules_pack`, with confidence. Real data feeds plug in later without redesign |

## 5. Scope: the household memory and three moments

### 5.0 Household memory (foundation)

The living model of the family. Built once in about two minutes, then kept current as things change (each change also writes a timeline entry).

- **Members:** relation, age (or date of birth), dependency, optional health flags (e.g. diabetes), language.
- **Money facts (4):** monthly take-home pay, total monthly EMIs, fixed household spend, emergency savings. Gold is optional and counts as liquidity.
- **Liabilities, assets:** loans (type, outstanding, EMI, end date), vehicles, devices, home.
- **Policies:** every policy the family holds, including the employer group cover, each linked to the product wording and its clauses.
- **Timeline:** a list of what happened (setup, document added, life change, hospital session, claim letter, WhatsApp message), written alongside each change to the household. The household itself is kept as plain current-state documents; event sourcing is on the roadmap.
- **Cover map:** a layered view of each person against each risk (health, life/income, critical illness, accident, vehicle, device, travel) by layer (statutory/government, employer, personal), over time.

### 5.1 Moment 1: Life changes

Trigger: the user types or says a change ("Joining a startup on 1 Dec", "Second baby due in May", "Parents moving in", "Buying a car").

Kavach:
1. Parses the change into a typed change set with an effective date.
2. Re-runs the cover map **as of that date** and shows what disappears and when (e.g. parents turn red on 1 Dec because the employer cover ends on 30 Nov).
3. Re-plans within the budget and shows a **diff** (added, removed, resized covers; budget change; calendar change).
4. Produces a **dated action checklist** ("Before 30 Nov: ask HR/insurer for group-to-individual migration for your parents").
5. **Prepares the actions**: the migration request letter/form filled from the household data, a reminder, a partner hand-off card. Rahul reviews and approves each.
6. **Acts on the date**: a WhatsApp nudge on the day it matters ("15 Nov: ask Acme HR to migrate Mummy and Papa's cover. The letter is ready, reply YES to get it as a PDF.").

### 5.2 Moment 2: At the hospital (the hero)

Trigger: a family member taps **At the hospital** (big button on the home screen of every family member), or sends a voice note and a photo of the estimate to Kavach on WhatsApp. The hero scene is a **planned** procedure: Suresh's angioplasty is scheduled for Monday.

Kavach, live, by voice (the camera captures a still of the estimate; the live session itself is audio-only):
1. Confirms who is admitted (one tap; already knows the family).
2. Asks the user to point the camera at the **hospital estimate** and capture it (or upload a photo). Reads the line items, the **room-category tariff** (what each head costs in each room category) and whether the hospital bills by room category, a flat rate or a package.
3. Answers aloud, in the user's language (Hindi or English):
   - **Which policy to use first**, and why.
   - **Room choice**: whether the room category exceeds the policy's room-rent limit, and what that does to the claim: proportionate deduction applies only to the charges the hospital prices by room category, never to medicines, consumables, implants, diagnostics or ICU, with the ₹ difference (Sharma family: about ₹1,50,800 in the ₹9,000 room vs about ₹60,800 in the ₹5,000 room, **₹90,000** less).
   - **Expected out-of-pocket cost** for each option.
   - **What to ask the desk** (short questions, e.g. "Is the ₹5,000 room available?"). If the estimate doesn't show whether charges change with the room, Kavach works out both answers and asks the desk that one question first (₹16,000 difference if the hospital doesn't bill by room); for a package rate it asks for the package price in the ₹5,000 room.
4. Shows a **"Why" panel**: each statement with its clause, the tariff columns that drove the deduction, the billing branch and the verifier's check.
5. Saves the session to the household timeline, sends Rahul a WhatsApp alert ("Mummy is at City Heart Hospital. Kavach told her to ask for the ₹5,000 room. Tap to see.") and offers a plain-text summary the user can share.

If the app won't open (no data, unfamiliar phone, low battery), the same answer comes back on WhatsApp as a Hindi voice note, a short text and a card image.

### 5.3 Moment 3: When a claim goes wrong

Trigger: the user photographs or uploads a **claim settlement / deduction / rejection letter**, or forwards it to Kavach on WhatsApp (insurers already send these letters on WhatsApp).

Kavach:
1. Reads the letter into line items (deduction amount, reason given, code).
2. Checks each deduction against the policy wording and the rules pack.
3. Marks each item **Challengeable / Possibly / Valid**, with the ₹ at stake and the clause.
4. Drafts the **grievance letter** to the insurer's grievance officer (and, later, the escalation to the Insurance Ombudsman), with clauses quoted.
5. The family reviews, edits, approves, and sends it themselves (copy, download PDF, or open in their email app). On WhatsApp the verdict and the appeal letter PDF come back in the same chat.

### 5.4 WhatsApp: a second door to the same agent

The **same Kavach agent and engine**, reached through WhatsApp instead of the app. People send a Hindi voice note, a photo or text; Kavach replies with a Hindi voice note, a short text and a card image, plus a link to the full card in the app. It is message-and-reply, not a live call, and it is a door for the three moments only: no onboarding or cover map in WhatsApp, and off-topic chat is politely declined.

| Moment | WhatsApp role |
|---|---|
| Hospital desk | Fallback door: voice note + estimate photo in, same answer out |
| Household alert | Rahul is told when Kamala uses Kavach (either door) |
| Job change | Dated nudge with the migration letter ready |
| Claim appeal | Forward the settlement letter; get the verdict and appeal PDF |

The live desk stays the hero; WhatsApp is never shown as the main experience. For the hackathon the video uses Meta's Cloud API test number and judges use the Twilio WhatsApp Sandbox (QR code on the landing page), both on one webhook.

## 6. Functional requirements

Priority: **M** must ship for the hackathon, **S** should ship, **C** could ship, **L** later (post-hackathon).

### Household and memory

| ID | Requirement | Pri |
|---|---|---|
| FR-H-01 | User can describe the family in one sentence by text or voice; Kavach drafts members with relations and ages | M |
| FR-H-02 | User confirms or corrects the family on a family card (tap to edit any member) | M |
| FR-H-03 | User enters 4 money facts with sliders/inputs; defaults pre-filled from typical values and marked "assumed" | M |
| FR-H-04 | User uploads policy documents (PDF or photo): employer benefits summary, policy schedule, policy wording | M |
| FR-H-05 | Kavach extracts policies, members covered, sum insured, key terms, renewal dates, each with a citation | M |
| FR-H-06 | Kavach asks at most 3 follow-up questions chosen by ₹ impact, as tap-to-answer chips | M |
| FR-H-07 | Every inferred fact shows "We assumed X" with a one-tap change | M |
| FR-H-08 | Cover map: members × risks × layers, coloured covered/partial/gap, with ₹ gap per cell | M |
| FR-H-09 | Household safety score (0–100) with a breakdown | M |
| FR-H-10 | Budget-fitted plan: recommended cover categories and sizes within the monthly protection budget; deferred items explained | M |
| FR-H-11 | Timeline of everything that happened (setup, documents, life changes, hospital sessions, claims, WhatsApp messages); tapping one shows what changed | M |
| FR-H-12 | Premium strip: next 12 months of premiums by month, with spike months flagged | S |
| FR-H-13 | Family access: owner invites a member (e.g. mother) who gets her own login, language and a simplified home | M |
| FR-H-14 | Returning-user memory: "Last time you said you're joining a startup on 1 Dec. Did it happen?" | S |
| FR-H-15 | Policy vault with policy detail, extracted terms and a clause viewer that highlights the source on the PDF page | M |
| FR-H-16 | Export data and delete household (DPDP rights) | S |
| FR-H-17 | Account aggregator / Bima Sugam / insurer API connectors | L |

### Moment 1: Life change

| ID | Requirement | Pri |
|---|---|---|
| FR-L-01 | Free-text/voice life-change input with examples | M |
| FR-L-02 | Parse into a typed change set with effective date; show the parse for confirmation | M |
| FR-L-03 | Cover map as of a date (timeline scrubber); show what changes on the effective date | M |
| FR-L-04 | Plan diff (added/removed/resized covers, budget, safety score before → after) | M |
| FR-L-05 | Dated action checklist | M |
| FR-L-06 | Prepared actions: migration/portability request letter, HR email draft, reminder, partner hand-off; each requires approval | M |
| FR-L-07 | Supported event types: job change, job loss, new child, marriage, parent becomes dependent, new loan, vehicle purchase, device purchase, international trip, relocation | M (job change, trip, vehicle), S (rest) |

### Moment 2: Hospital desk

| ID | Requirement | Pri |
|---|---|---|
| FR-D-01 | One-tap hospital mode from the home screen of any family member | M |
| FR-D-02 | Live bidirectional voice in Hindi and English with interruption (barge-in) | M |
| FR-D-03 | Camera: read a hospital estimate, including its room-category tariff and billing type, from a captured still or an uploaded photo (no video is streamed to the live model) | M |
| FR-D-04 | Patient selection with the household's knowledge pre-loaded (policies, conditions, past claims) | M |
| FR-D-05 | Which-policy-first recommendation computed by the engine | M |
| FR-D-06 | Room-rent check with proportionate-deduction impact (only on heads priced by room category; never ICU) and ₹ comparison of room options | M |
| FR-D-07 | Out-of-pocket estimate per option, with a range where data is missing | M |
| FR-D-08 | "Ask the desk" questions; when the billing type is unknown, compute both branches and ask the one question that decides between them; for a package rate, ask for the package price in the room within the limit | M |
| FR-D-09 | Why panel: each statement → clause + verifier verdict | M |
| FR-D-10 | Large-type, high-contrast desk theme; captions always on | M |
| FR-D-11 | Graceful fallback to text chat and photo upload if the live connection fails, and the WhatsApp door as a second fallback | M |
| FR-D-12 | Session saved to timeline; shareable plain-text summary (user shares it) | S |
| FR-D-13 | Pre-authorisation (cashless) checklist: documents to carry, TPA desk, time limits | S |
| FR-D-14 | Household alert to the account owner on WhatsApp (or in the app) when a member uses the desk | M |

### WhatsApp door

| ID | Requirement | Pri |
|---|---|---|
| FR-W-01 | Receive text, photos and Hindi voice notes; map the sender number to a household member | M |
| FR-W-02 | Reply with a short text, a Hindi voice note of the engine-built `say` line, a card image and a link to the full card | M |
| FR-W-03 | First-message consent (DPDP); media deleted after processing | M |
| FR-W-04 | Insurance-only scope: off-topic messages get a polite decline | M |
| FR-W-05 | Proactive messages (household alert, dated reminder) only through approved utility templates or inside the recipient's 24-hour window; otherwise in-app only | M |
| FR-W-06 | Claim letter forwarding returns the deductions verdict and the appeal letter PDF | S |
| FR-W-07 | Per-sender rate limit | M |

### Moment 3: Claim appeal

| ID | Requirement | Pri |
|---|---|---|
| FR-C-01 | Upload/photograph settlement or rejection letter | M |
| FR-C-02 | Extract each deduction with amount and stated reason | M |
| FR-C-03 | Classify each: challengeable / possibly / valid, with clause and rule | M |
| FR-C-04 | Draft grievance letter with clauses quoted; editable; approval required | M |
| FR-C-05 | Escalation ladder (insurer GRO → Bima Bharosa portal → Insurance Ombudsman) with dates | S |
| FR-C-06 | Track claim case status in the timeline | S |

### Proof and trust

| ID | Requirement | Pri |
|---|---|---|
| FR-P-01 | Proof page: policy-reading accuracy on 8 labelled real public wordings (stated honestly as 8; more if time allows), per field, with method | M |
| FR-P-02 | Every engine rule has an ID, a plain-English statement and a source citation | M |
| FR-P-03 | Disclaimers and consent (DPDP) at onboarding; "illustrative" labels on all mock products | M |
| FR-P-04 | Demo mode: "Try with the Sharma family" without sign-in, with a demo clock to jump to each moment | M |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Live voice first-audio latency (end of user speech → start of Kavach audio) | ≤ 1.5 s p50, ≤ 3 s p95 |
| NFR-02 | Estimate read (photo → line items on screen) | ≤ 8 s p50 |
| NFR-03 | Policy wording ingest (40-page PDF → clauses + terms) | ≤ 90 s, runs in background with progress |
| NFR-04 | Cover map recompute after an event | ≤ 2 s |
| NFR-05 | Engine correctness | 100% of engine unit tests pass; every worked example in 05-rules-engine.md is a test |
| NFR-06 | Policy-reading accuracy (key fields) | Target ≥ 90% exact-match on the labelled set; publish whatever we get honestly |
| NFR-07 | Accessibility | WCAG 2.2 AA; desk theme meets AAA contrast for body text |
| NFR-08 | Mobile-first | Works on a 360 px wide Android phone in Chrome; also good on desktop for judges |
| NFR-09 | Languages | English and Hindi end to end in the hero flow; UI strings in both |
| NFR-10 | Availability during judging | Cloud Run min instances ≥ 1 for API; no cold-start on the demo path |
| NFR-11 | Privacy | Health and financial data encrypted at rest (Google default) and in transit; least-privilege service accounts; no PII in logs |
| NFR-12 | Cost | Fits a hackathon budget; Flash-class models for high-volume calls, Pro-class only for reasoning and verification |

## 8. Success metrics

**For the hackathon (what judges see):**
- Live link runs the three moments end to end with the sample family and with a fresh household.
- Hero moment works first time on video, in Hindi.
- Proof page shows a measured accuracy number on 8 labelled real public wordings.
- Rupee outcome per test family: "Kavach changed the Sharma family's expected out-of-pocket from ₹1,50,800 to ₹60,800 at the desk, ₹90,000 less" (see the worked example in 05-rules-engine.md).
- A judge with a phone gets the same answer on WhatsApp through the sandbox.

**For the business (after):** setup completion rate, % of households uploading ≥ 1 document, % acting on ≥ 1 gap within 14 days, hospital sessions per 1,000 households, ₹ recovered via appeals.

## 9. Out of scope for the hackathon

- Selling real policies, real quotes, or naming a specific product as a recommendation.
- Sending anything to a third party on the user's behalf (email, insurer portals, HR). Kavach drafts; the user sends. WhatsApp messages go only to the household's own opted-in numbers.
- A public production WhatsApp number (needs Meta business verification); the hackathon uses the Meta test number and the Twilio sandbox.
- Account aggregator, Bima Sugam, insurer APIs (designed for, not built; see [12-roadmap.md](12-roadmap.md)).
- User interviews and letters of interest (Kshitij, 14 Oct: judges won't see them).
- Languages beyond Hindi and English.
- Motor claims and life claims workflows (health claims only for moment 3).

## 10. Glossary (Indian insurance terms used throughout)

| Term | Meaning |
|---|---|
| **GMC** | Group Medical Cover: the employer's group health policy. Ends when employment ends |
| **Sum insured (SI)** | Maximum the health policy pays in a policy year |
| **Floater** | One sum insured shared by all covered family members |
| **Top-up / Super top-up** | Pays only above a deductible. Top-up: per claim. Super top-up: aggregate over the year |
| **Room-rent limit** | Cap on room charges per day, often 1% of SI (normal) and 2% (ICU), or a room category ("single private room") |
| **Proportionate deduction** | If the room exceeds the limit, the charges the hospital prices by room category (surgeon, OT, nursing, doctor visits…) are cut in the same proportion. Never applied to pharmacy, consumables, implants, devices, diagnostics or ICU, or at a hospital that doesn't bill differently by room (IRDAI 2020 circular; see 05) |
| **Room-category tariff** | The hospital's price list showing what each head costs in each room category; printed on many private-hospital estimates |
| **Differential / flat / package billing** | Whether a hospital charges more for treatment in a pricier room (differential), the same whatever the room (flat), or one fixed price per room category (package) |
| **Co-pay** | Share of each admissible claim the insured pays, often 10–20% for seniors |
| **Sub-limit** | Cap for a specific treatment (e.g. cataract ₹40,000 per eye) |
| **PED** | Pre-existing disease. Has a waiting period before it is covered |
| **Cumulative bonus / NCB** | Increase in sum insured for claim-free years |
| **TPA** | Third-party administrator who processes claims for the insurer, usually at a hospital desk |
| **Cashless / pre-authorisation** | Insurer approves the bill directly with a network hospital |
| **Portability / migration** | Moving to another insurer (portability) or from group to individual cover with the same insurer (migration), keeping credit for waiting periods |
| **Policy wording** | The full product contract (same for every buyer of the product). **Policy schedule** is the personal page: who is insured, SI, dates |
| **UIN** | IRDAI's unique identification number for a product |
| **GRO** | Grievance redressal officer at the insurer |
| **Bima Bharosa** | IRDAI's grievance portal |
| **Insurance Ombudsman** | Free statutory dispute resolution for policyholders |
| **IRDAI** | Insurance Regulatory and Development Authority of India |
| **DPDP Act** | Digital Personal Data Protection Act 2023 |
| **AA** | Account Aggregator: RBI-regulated consent rail for financial data |
