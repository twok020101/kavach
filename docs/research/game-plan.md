# Kavach: hackathon game plan (v3)

Written 14 Oct 2026, revised twice that evening. It combines [brief.md](brief.md), [feasibility.md](feasibility.md), [market-scan.md](market-scan.md), [past-winners.md](past-winners.md) and the six themes on [themes.html](https://aibuildercup.com/themes.html).

**Scope of this document:** the problem and the product design only. Implementation (stack, architecture, workstreams, build schedule) is deliberately left out until Kshitij says to plan the build.

## Decisions so far (Kshitij, 14 Oct)

| Decision | Answer |
|---|---|
| Adopt Kavach with three moments and the hospital desk as the hero | **Yes** |
| User interviews and letters of interest | **Not now.** The first goal is the hackathon and judges won't see them. They return as a business step after the hackathon |
| Start implementation | **Not yet.** Stay on problem and product design |

---

## 1. The honest answer: can it be a 10?

**Yes, as designed here.** The earlier versions (the brief v2 household planner at about 6/10, the job-change planner at about 8/10) stayed *advisors*: they read, reasoned and recommended, and then the family was on its own. What won comparable Google and Hack2skill events went further: the agent **does the work** at the moment it matters, in a way the judges can see and check.

Three things take Kavach from 8 to 10:
1. **It shows up where the money is actually lost: the hospital admission desk.** That's where an upgraded room can quietly shrink the *whole* claim through proportionate deduction (rule to verify), where families don't know whether to use the employer policy or their own first, and where nobody reads the 40-page policy wording.
2. **It acts, not just advises.** It prepares the forms, letters and reminders a family needs, and the human approves each one.
3. **It proves itself.** Every statement cites the clause it came from, and we show a measured accuracy score for how well Kavach reads real public policy wordings.

**Caveat:** nobody controls a 10 from every judge. The aim is to remove every reason to mark us down and give the judges one moment they'll remember.

---

## 2. The concept

**Kavach: the AI that stands beside your family at every insurance moment.** One household memory (the family, their money, every policy they hold, the employer cover, and everything that has happened) and three moments where it acts.

| Moment | What Kavach does | Why it matters |
|---|---|---|
| **1. Life changes** (job switch, baby, loan, parents moving in) | Re-plans the layered cover map, shows what disappears and on what date, prepares the forms to keep cover continuous, fits the fix to the budget | Best-evidenced pain: TATA AIG (Aug 2026) found ~45% of corporate employees have only employer cover, and only 40% know how to keep it across a job change |
| **2. At the hospital (the hero)** | Live, by voice and camera: reads the hospital estimate and the family's policies on the spot, explains room-rent limits, sub-limits, co-pay and which policy to use first, estimates out-of-pocket cost, in Hindi or English | This is where the money is lost. It's the most visual and emotional moment, and every judge has lived it |
| **3. When a claim goes wrong** | Reads the rejection or deduction letter against the policy wording, decides whether it's worth challenging, and drafts the appeal or ombudsman complaint with the clause cited, for the family to send | Shows insurance visibly paying back, not just being sold |

The household memory links the three moments, and it's the business moat. At the hospital, Kavach already knows the father's diabetes, the employer floater and the personal top-up, because it learned them earlier.

### Product principles
- **Ask only what changes the outcome by real money.** Everything else is inferred and shown as "we assumed X, tap to change".
- **Every claim is cited and checked.** Each statement links to the clause it relies on, and a second check confirms it before the family sees it.
- **Numbers come from rules, not guesses.** Rupee figures are calculated from the policy terms, never invented by the AI.
- **The family decides.** Kavach prepares, the family approves. It gives category-level guidance and hands the purchase to a licensed partner.
- **Built for the whole family.** Voice-first in Hindi and English, usable by a 62-year-old parent, with large type and high contrast.

---

## 3. What a 10 means for each criterion

| Criterion (weight) | What a 10 looks like | How Kavach gets there |
|---|---|---|
| **Gen AI & technical merit (40%)** | AI doing visible multi-step work; multimodal and live; grounded and auditable; measured | Reads full policy wordings, benefits documents, hospital estimates and letters. Live voice-and-camera help at the desk. Plans across life events with memory. Prepares actions for approval. Every claim is cited and verified. A published accuracy score on 20+ real public policy wordings |
| **Problem alignment & impact (25%)** | A sharp, sourced problem and a quantified outcome for real families | Sourced public data (TATA AIG on employer-cover reliance, Swiss Re's ~US$32bn health protection gap for India, out-of-pocket spending figures). A sourced number for claim deductions or rejections in India, from IRDAI or Insurance Ombudsman reports (to find; don't guess). A rupee outcome per test family ("Kavach found ₹X of exposure and saved ₹Y at the hospital desk") |
| **Innovation & creativity (25%)** | A moment the judges have never seen; a new framing of an old category | The live hospital desk agent. "From policy seller to family protection agent." The cover map moving through time on a life event |
| **UX & solution design (10%)** | Effortless, accessible, trustworthy | Voice-first in two languages, mobile-first, chips instead of forms, a "show me why" panel on every answer, consent and privacy handled properly under the DPDP Act |

**Without user interviews**, impact rests on public data and the measured rupee outcome per test family. That's enough for judges, provided every number is sourced.

**Side prizes in reach:** Best use of Google Cloud AI, Most Impactful, Best UI/UX.

---

## 4. Alternatives checked

| Angle | Ceiling | Verdict |
|---|---|---|
| **Kavach with three moments** | 9–10 | **Adopted** |
| Hospital desk co-pilot on its own | 9 | The strongest single demo but a thin business without the household memory, so it's the hero *inside* Kavach |
| Claim-rejection appeal agent on its own | 8 | Strong document work, but Insurance Samadhan already owns it, and it only helps after the damage |
| Job-change planner on its own | 8 | Good evidence, but advice-only |
| Household planner (brief v2) | 6 | Too broad; looks like a calculator with a chat box |
| Fraud or underwriting tool for insurers | 7–8 | The most crowded part of BFSI, and unrelated to the business Kshitij wants |

---

## 5. The demo journey (3-minute video)

**Persona: Rahul, 34, Bengaluru.** Wife, daughter aged 5, parents aged 62 and 58 (father has diabetes). A ₹5L employer floater that includes his parents, a ₹5L personal top-up, one LIC endowment, a car loan. Policy wordings are real public documents from insurers' websites; Rahul's benefits document, hospital estimate and letters are made-up samples, clearly marked.

| Time | Beat | Shows |
|---|---|---|
| 0:00–0:12 | Hook: "Every Indian family has insurance. Few know what it actually pays." | |
| 0:12–0:40 | **Setup in 25 seconds.** Rahul speaks one sentence about his family and adds three documents. The family card and layered cover map build themselves, every fact tap-to-cite | Document reading, citations, memory |
| 0:40–1:15 | **Moment 1, job change.** "Joining a startup on 1 Dec." The map moves to that date and his parents go red. Kavach lists what to do before the last day, fits it to the budget, and has the form ready for Rahul to approve | Planning over time, action with approval |
| 1:15–2:20 | **Moment 2, the hero. Months later, his father is admitted.** Rahul's mother opens Kavach, speaks in Hindi and points the camera at the hospital estimate. Kavach answers aloud: which policy to use first, why the ₹9,000 room would cut the whole claim, what to ask the desk, and the expected out-of-pocket cost. A "why" panel shows the clauses and the check | Live voice and vision, long-document reasoning, verification, accessibility |
| 2:20–2:35 | **Moment 3, in one frame.** A deduction letter arrives; Kavach marks one item as challengeable and drafts the appeal with the clause quoted | Document reasoning, action |
| 2:35–2:58 | Proof and scale: accuracy on 20+ real wordings, the rupee outcome per family, the employer business model, "India first, Singapore next" | |

**The one moment that must be flawless:** Rahul's mother at the hospital desk.

---

## 6. Facts to verify before they go into the product

These are design checks, not implementation. Every rule Kavach relies on must cite its source.
- **Room-rent proportionate deduction:** whether and how it still applies under current IRDAI health-insurance rules.
- **Moving from group to individual health cover:** the current IRDAI rules, and which insurers offer it with credit for waiting periods.
- **Waiting periods** for pre-existing conditions on new retail health policies.
- **Which policy to claim first** when a family holds both employer and personal cover.
- **A sourced figure** for claim deductions or rejections in India (IRDAI annual report or Insurance Ombudsman reports).
- **The public policy wordings** to use for the accuracy check, with hand-labelled answers.

---

## 7. The competition

Prizes are overall, so Kavach competes with all six themes: BFSI, Retail & Commerce, Manufacturing, Media & Content, Future of Work, and Sustainability & Social Impact.
- **BFSI** will be full of fraud detectors, KYC processors and finance chatbots. The hospital moment and the actions put clear distance between Kavach and any chatbot.
- **Media & Content** will have the flashiest demos. The live voice-and-camera scene is our answer on wow.
- **Sustainability & Social Impact** usually wins "Most Impactful". A 62-year-old mother getting help in Hindi at a hospital desk competes on that ground.
- **Future of Work and Manufacturing** will be technically strong but less relatable. The accuracy score answers them on technical soundness.

---

## 8. The global story

- **The pattern is the same everywhere:** a base layer you didn't choose (state or employer) plus private top-ups, and the money is lost in the seams and at the hospital desk. India: employer cover plus retail health. Singapore: MediShield Life plus Integrated Shield Plans with co-payment. Australia: Medicare plus private hospital cover with excesses. US: employer plans with deductibles and networks.
- **One brain, one rules pack per country.** The AI reads, asks and explains everywhere; each country adds its base layers and rules.
- **Data sources plug in later:** account aggregators and Bima Sugam (India), SGFinDex (Singapore), insurance data APIs (US). Every fact already records where it came from.
- **For the Singapore finale, if shortlisted:** a Singapore rules pack and a hospital scene with an Integrated Shield Plan.

---

## 9. Key risks

| Risk | Mitigation |
|---|---|
| Wrong advice at a hospital desk is high-stakes | Citations, a second check, "confirm with the insurance desk" on every answer, cautious wording, the accuracy score |
| The rules we rely on are wrong or out of date | Verify each one (section 6) and cite the source |
| Impact looks thin without real users | Sourced public data plus a measured rupee outcome per test family |
| Regulatory optics | Category-level guidance, no named product recommendations, licensed partner handoff, proper consent |
| Eligibility and category quirks (India in JAPAC; mismatched submission categories) | Confirm on Discord or by email |
| Three moments is a lot for 3 minutes | The hospital moment is the hero; moment 3 can shrink to a single frame |

---

## 10. Open questions for Kshitij

1. Is Rahul the right persona, or do you want the hero at the hospital desk to be someone else (for example a parent using it alone)?
2. Should moment 3 (claim appeal) stay in the video as one frame, or move to the deck only?
