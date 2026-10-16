# 09 · Demo data, video script, deck and submission

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**The personas and sample documents the app is seeded with, the 3-minute video shot by shot, the deck outline, and the submission checklist.** Numbers here come from the engine worked examples in [05-rules-engine.md](05-rules-engine.md); if the engine output changes, update this file from the engine's worked examples (`pnpm --filter @kavach/engine check`), never by hand.

---

## 1. Demo timeline (demo clock checkpoints)

| Checkpoint | Demo date | What has happened |
|---|---|---|
| `setup` | 14 Oct 2026 | Rahul sets up the household; Plan v1 |
| `job_change` | 10 Nov 2026 | Rahul records "Joining a startup on 1 Dec"; Plan v2; migration letter approved; 15 Nov WhatsApp nudge scheduled |
| `hospital` | 8 Feb 2027 | Parents are on the migrated individual policy; Suresh's **planned** angioplasty at City Heart Hospital is on Monday; Kamala opens Kavach |
| `claim` | 2 Mar 2027 | Settlement letter arrives with deductions; the parents' policy has paid ₹2,04,640 |

`POST /v1/households/{hid}/demo:reset {checkpoint}` resets the household to that checkpoint from `data/personas/sharma.json`, so each video beat can be recorded independently and judges can jump straight to any moment. `POST /v1/public/demo` clones the household per visitor (default checkpoint `hospital`), so judges never collide.

## 2. Persona: the Sharma family (`data/personas/sharma.json`)

| Field | Value |
|---|---|
| Household | Sharma family, Bengaluru (tier 1) |
| Rahul | 34, self, product manager at "Acme Software" (fictional), earning |
| Priya | 32, spouse, not earning (answer to smart question) |
| Anaya | 5, daughter |
| Suresh | 62, father, type 2 diabetes since 2019, dependent; moved from Lucknow with Kamala to live with Rahul |
| Kamala | 58, mother, Hindi speaker (moved from Lucknow, which is why she speaks Hindi in Bengaluru), own login, uses WhatsApp daily, dependent |
| Money | Take-home ₹1,85,000/mo; EMIs ₹28,000; fixed spend ₹70,000; emergency fund ₹4,00,000 |
| WhatsApp | Rahul and Kamala have placeholder numbers in the persona; for filming, two real phones are registered as the Meta test number's recipients |
| Liabilities | Car loan, outstanding ₹6,50,000, EMI ₹28,000, ends Mar 2029 |
| Assets | Hyundai Creta 2023 (₹14L); iPhone (2026, ₹1.8L) |
| Policies (Oct 2026) | Acme GMC ₹5L floater incl. parents (employer); super top-up ₹5L, aggregate deductible ₹5L, all 5 members, ₹14,200/yr, renews 14 Jun; LIC endowment SA ₹10L, ₹48,000/yr; motor comprehensive ₹21,500/yr, renews 9 Jan |
| After job change | Startup GMC ₹3L (Orbit Labs; Rahul, Priya, Anaya); parents migrated to an individual ₹5L policy (room rent 1% SI = ₹5,000/day, 20% co-pay for 61+, proportionate deduction applies, continuous cover since 2022) |

The persona file holds the household at `setup` plus, for each later checkpoint, the policies in force and the fields that change, so seeding = copying one document. Liabilities and assets are used by the PX-1 plan (moment 1) and are added to the persona when that work package lands.

### Secondary personas (for tests and the Proof page "rupee outcome per family")

| Persona | Situation | What Kavach should find |
|---|---|---|
| **Meera, 29, Pune** | Freelance designer, single, supports her mother (55). No employer cover; one ₹3L retail policy for herself; ₹80k/mo take-home | Mother uncovered; own SI low for tier-1; no term needed (no dependents beyond mother → small term); travel to Singapore in Jan → travel cover |
| **Arjun (41) & Fatima (39) Khan, Delhi** | Two children (9, 6), home loan ₹48L, term ₹50L, GMC ₹10L via Fatima's employer, motor | Term far below need (loan alone ≈ cover); health contingent on Fatima's job; PA missing |

## 3. Sample documents (`data/samples/`)

All sample personal documents are **made up and marked "SAMPLE – FOR DEMONSTRATION"** in the footer of every page; the hospital, insurers, employer, people, policy numbers and UINs are fictional. Policy *wordings* for the Proof page are real public documents from insurers' websites (see 03 §9.1), fetched by script and not committed. The samples are rendered from HTML templates in `scripts/samples/templates/` with `pnpm samples`; see `data/samples/README.md`.

| File | Kind | Content notes |
|---|---|---|
| `city-heart-estimate.pdf` / `.png` | hospital_estimate | City Heart Hospital, Bengaluru: estimate for Suresh Sharma (62), **planned** PTCA, 4 days. **Room-category tariff table**: Deluxe Single ₹9,000/day vs Single Standard ₹5,000/day, every head priced in both columns (HX-1), totals ₹3,46,000 / ₹2,80,000; tariff note says nursing, surgeon, cath lab and doctor visits are priced by room |
| `city-heart-estimate-photo.png` | hospital_estimate | The same estimate made to look like a phone photo: tilted, warm light, shadow on a desk. Kshitij also prints the PDF and photographs it (5 photos incl. one angled and one with glare) |
| `suraksha-settlement-letter.pdf` / `.png` | claim_letter | CX-1: bill ₹2,80,000; deductions non-payable ₹6,000, proportionate deduction ₹9,600, consumables ₹8,600; co-pay 20% ₹51,160; approved ₹2,04,640 |
| `acme-benefits-summary.pdf` / `-p1..p3.png` | benefits_summary | Acme Software group health: ₹5L family floater incl. parents; room rent 1% of SI; no co-pay; maternity ₹50k; page 3 §9.1: cover ends on the last working day, migration request due 15 days before it |
| `parents-policy-schedule.pdf` / `-p1..p3.png` | policy_schedule | Parents' individual floater migrated from the Acme group policy: SI ₹5L, 01-12-2026 to 30-11-2027; wording extract §3.1 room rent 1% of SI, §3.2 proportionate deduction, §3.3 no proportionate deduction on ICU, §5.3 20% co-pay for 61+ |
| `supertopup-schedule.pdf` / `-p1..p2.png` | policy_schedule | Super top-up: all five Sharmas, SI ₹5L, aggregate deductible ₹5L (§2.1), premium ₹14,200, renews 14-06-2027 |

Each has a recorded reader output in `apps/api/fixtures/` so the flows run with `FAKE_LLM=1`. Later (Layer 3, if time): an LIC endowment photo, a motor schedule and the startup offer benefits.

## 4. The 3-minute video (shot list)

Target 2:55. Screen recordings at 1080p from a real phone (Android, Chrome) mirrored, plus short real-world shots (hospital-like desk, hands and phone; Kamala's face is optional, which makes casting easier). Voice-over in English; the hospital scene in Hindi with English subtitles. Timings follow red-team-response.md §4–§5: hook 10 s, setup 10 s, job change 25 s, **hospital 90 s**, claim 15 s, proof 25 s.

| Time | Beat | On screen | Voice-over / audio | Shows (for judges) |
|---|---|---|---|---|
| 0:00–0:10 | **Hook** | Black → text: "Every Indian family has insurance. Few know what it actually pays." Then a phone at a hospital desk | VO: "45% of corporate employees in India have nothing beyond their employer's cover. They find out at the worst moment." (TATA AIG, Aug 2026) | Problem |
| 0:10–0:20 | **Setup montage** | Rahul's sentence → family card ("Mummy-Papa moved from Lucknow to live with us") → three documents dropped; facts with citation chips; cover map reveals, parents' cells amber "depends on job" | VO: "Rahul tells Kavach about his family once. Gemini reads every page and cites every fact." | Multimodal reading, citations, memory |
| 0:20–0:45 | **Moment 1: job change** | S17 "Joining a startup on 1 Dec" → S19 scrubber glides to 1 Dec, parents turn red; diff + parents' health via migration; S20 letter, Rahul approves → **WhatsApp on Rahul's phone: "15 Nov: ask Acme HR to migrate Mummy and Papa's cover. The letter is ready, reply YES…"** | VO: "Kavach sees what disappears on what date, prepares the letter, and reminds him on the day." | Planning over time, an agent that acts on a date |
| 0:45–2:15 | **Moment 2: the hero (90 s)** | See the beat table below | Hindi with English subtitles | Live voice, Gemini reading the tariff, grounding, fallback door, household memory |
| 2:15–2:30 | **Moment 3 in one frame** | S31: letter photo → deductions table; "Up to ₹14,560 may be recoverable"; S32 appeal letter with clause quoted | VO: "When the claim is cut, Kavach checks each deduction against the policy and drafts the appeal." | Document reasoning, action |
| 2:30–2:55 | **Proof and scale** | S26 Proof: accuracy on 8 real wordings (live number); slide-6 list of what Gemini does; architecture (Gemini Pro/Flash/Live/TTS, Cloud Run, Firestore, WhatsApp); "India first, Singapore next" | VO: "Every rupee comes from tested rules, every claim is cited, and we measure how well it reads real policies. Kavach: standing beside your family at every insurance moment." | Technical merit, impact, feasibility |

### Hospital beat (90 s, from 0:45)

| Time in beat | On screen | Audio | Purpose |
|---|---|---|---|
| 0:00–0:08 | "Papa's angioplasty is on Monday." Kamala at the desk with the printed estimate | Kamala: "Papa ki angioplasty Monday ko scheduled hai…" | Planned procedure |
| 0:08–0:50 | App desk mode (S21 → S22): she speaks in Hindi, points the phone at the estimate and captures it; `AgentSteps`; Kavach answers aloud; S23 cards build: "₹9,000 room: about ₹1,50,800. ₹5,000 room: about ₹60,800." | Kavach: *"Pehle parents wali policy ka card TPA desk par dijiye. ₹9,000 wale room mein doctor aur operation ke charges bhi zyada hain, aur insurance unpar katauti karega. Aapko lagbhag ₹1,50,800 dene padenge. ₹5,000 wala room maangiye, tab lagbhag ₹60,800. Sign karne se pehle TPA desk se confirm kar lijiye."* | Live voice + Gemini reading the estimate (Gen AI) |
| 0:50–1:00 | Why panel: the tariff columns highlighted, "deduction applies because these charges change with the room", clause and rule IDs; the "₹16,000 if the hospital doesn't price by room" branch for two seconds | – | Grounding |
| 1:00–1:08 | Phone with the app closed: the same photo plus a voice note on WhatsApp; the Hindi voice-note reply and card arrive | Kavach voice note | Fallback door, realism |
| 1:08–1:18 | Rahul's phone in a meeting: WhatsApp alert "Mummy is at City Heart Hospital. Kavach told her to ask for the ₹5,000 room. Tap to see." He taps through to the cards | – | Household memory |
| 1:18–1:30 | Kamala asks the desk "₹5,000 wala room milega?"; the desk nods | Kamala | Outcome |

**The one moment that must be flawless:** the hospital beat. Record it 5+ times; pick the best real take. If the live model misbehaves on the day, re-record — do not fake audio. State in the README that the video shows the live app. The WhatsApp shots use the **Meta test number** (looks like a real business chat); judges use the Twilio sandbox.

### Recording checklist
- Demo household reset to each checkpoint before its beat.
- Phone: Do Not Disturb, full brightness, large text off (except Kamala's phone: Large).
- Quiet room for voice; second take with background hospital noise to show robustness (use if clean).
- Rahul's and Kamala's numbers message the bot before each take until the Meta templates are approved, so replies and the alert are inside the 24-hour window.
- Captions burned in for the Hindi part.
- Music: soft, royalty-free, ducked under voice.
- Export 1080p, < 3:00, upload to YouTube (unlisted is fine if allowed; else public).

## 5. Deck outline (PDF, ~12 slides)

1. **Title:** Kavach — standing beside your family at every insurance moment. Team, track (BFSI).
2. **Problem:** three moments where families lose money; TATA AIG 45% stat; out-of-pocket share of health spend (sourced); protection gap (Swiss Re). All sourced on-slide.
3. **Who:** Rahul and Kamala (personas), why the hospital desk.
4. **Solution:** household memory + 3 moments (one diagram).
5. **Demo highlights:** 3 screenshots with captions (cover map turning red; hospital cards in Hindi with ₹90,000; deduction check) plus the WhatsApp reply on a phone.
6. **How the AI works** — name exactly what Gemini does: reads the room-category tariff from a photo, decides whether the deduction can apply (the billing branch), picks the one question to ask the desk, understands a Hindi voice note, talks live in Hindi, and drafts the appeal citing the clause. The engine computes every rupee.
7. **Trust:** citations, verifier, Proof page metrics, "the family decides".
8. **Architecture on Google Cloud:** Cloud Run (Fastify API, live bridge, WhatsApp webhook), Firebase App Hosting (Next.js), Firestore (plain documents + vector search), Vertex AI Gemini Pro/Flash/Live/TTS through `@google/genai`, ADK for the multi-step agents; event sourcing on the roadmap.
9. **Impact:** rupee outcome per test family (Sharma ₹90,000 at the desk + ₹14,560 appeal; honest ₹16,000 when the hospital doesn't bill by room), who benefits, accessibility (Hindi, voice, older users, WhatsApp they already use).
10. **Business model & feasibility:** employers pay a per-employee monthly fee for "family cover continuity" (exit migration, the hospital desk and claim help for parents); later a licensed partner earns advice fees, not product commission. Frequency: WhatsApp carries the year-round touches (renewals, migration deadlines, claim status). Moat: policies arrive where families already are (forwarded on WhatsApp). Liability: every spoken rupee comes from a tested rule with a citation; uncertain branches are said out loud. Regulation (IRDAI, DPDP).
11. **Scalability:** rules packs per country (India → Singapore: MediShield Life + Integrated Shield Plans), data rails (AA, Bima Sugam, SGFinDex).
12. **Roadmap & ask.**

Design: use the Kavach design system (07): sand background, indigo headings, marigold accents, Plus Jakarta Sans. Export to PDF.

## 6. Submission checklist (due Sun 18 Oct 2026; confirm the exact cut-off time and time zone with the organisers)

| Item | Owner | Check |
|---|---|---|
| Live link (Firebase App Hosting URL or custom domain) | – | Opens on a phone in ≤ 3 s; "Try the hospital scene" reaches ₹90,000 in under a minute logged-out; "Try with the Sharma family" works; all 4 checkpoints work |
| WhatsApp sandbox | – | A fresh number joins via the QR, sends a photo and a voice note, gets the Hindi voice note and card back; README states the 3-day membership and 24-hour window honestly |
| Demo video < 3 min | – | Public/unlisted link plays; English; Hindi subtitled |
| Public GitHub repo | – | README with live link, video, sandbox QR, architecture diagram, setup instructions, model IDs, eval results (8 wordings), licence, honest notes (samples are synthetic); no secrets (secret scanning on; Meta/Twilio tokens only in Secret Manager) |
| Deck PDF | – | ≤ 12 slides; sources on slides |
| Category | – | BFSI selected (confirm the category mismatch with organisers, see brief.md) |
| Eligibility confirmed | – | India in JAPAC confirmed on Discord/email |
| Cloud Run min instances | – | ≥ 1 through the judging window (19 Oct – 6 Nov); per-IP and per-WhatsApp-number limits; 5-minute live session cap and daily live-minutes ceiling |
| Budget alert | – | GCP budget alert set |
| Disclaimers | – | Visible on Plan, Desk, Landing |
