# 09 · Demo data, video script, deck and submission

**The personas and sample documents the app is seeded with, the 3-minute video shot by shot, the deck outline, and the submission checklist.** Numbers here come from the engine worked examples in [05-rules-engine.md](05-rules-engine.md); if the engine output changes, update this file from the test fixtures, never by hand.

---

## 1. Demo timeline (demo clock checkpoints)

| Checkpoint | Demo date | What has happened |
|---|---|---|
| `setup` | 14 Oct 2026 | Rahul sets up the household; Plan v1 |
| `job_change` | 10 Nov 2026 | Rahul records "Joining a startup on 1 Dec"; Plan v2; migration letter approved |
| `hospital` | 8 Feb 2027 | Parents are on the migrated individual policy; Suresh admitted for angioplasty; Kamala opens Kavach |
| `claim` | 2 Mar 2027 | Settlement letter arrives with deductions |

`POST /demo:reset {checkpoint}` replays the persona's events up to that point, so each video beat can be recorded independently and judges can jump straight to any moment.

## 2. Persona: the Sharma family (`data/personas/sharma.json`)

| Field | Value |
|---|---|
| Household | Sharma family, Bengaluru (tier 1) |
| Rahul | 34, self, product manager at "Acme Software" (fictional), earning |
| Priya | 32, spouse, not earning (answer to smart question) |
| Anaya | 5, daughter |
| Suresh | 62, father, type 2 diabetes since 2019, dependent |
| Kamala | 58, mother, Hindi speaker, own login, dependent |
| Money | Take-home ₹1,85,000/mo; EMIs ₹28,000; fixed spend ₹70,000; emergency fund ₹4,00,000 |
| Liabilities | Car loan, outstanding ₹6,50,000, EMI ₹28,000, ends Mar 2029 |
| Assets | Hyundai Creta 2023 (₹14L); iPhone (2026, ₹1.8L) |
| Policies (Oct 2026) | Acme GMC ₹5L floater incl. parents (employer); super top-up ₹5L, aggregate deductible ₹5L, all 5 members, ₹14,200/yr, renews 14 Jun; LIC endowment SA ₹10L, ₹48,000/yr; motor comprehensive ₹21,500/yr, renews 9 Jan |
| After job change | Startup GMC ₹3L (Rahul, Priya, Anaya); parents migrated to an individual ₹5L policy (room rent 1% SI, 20% co-pay for 61+, proportionate deduction applies) |

The persona file is an ordered list of events (the same events the app writes), so seeding = replaying.

### Secondary personas (for tests and the Proof page "rupee outcome per family")

| Persona | Situation | What Kavach should find |
|---|---|---|
| **Meera, 29, Pune** | Freelance designer, single, supports her mother (55). No employer cover; one ₹3L retail policy for herself; ₹80k/mo take-home | Mother uncovered; own SI low for tier-1; no term needed (no dependents beyond mother → small term); travel to Singapore in Jan → travel cover |
| **Arjun (41) & Fatima (39) Khan, Delhi** | Two children (9, 6), home loan ₹48L, term ₹50L, GMC ₹10L via Fatima's employer, motor | Term far below need (loan alone ≈ cover); health contingent on Fatima's job; PA missing |

## 3. Sample documents (`data/samples/`)

All sample personal documents are **made up and watermarked "SAMPLE — NOT A REAL DOCUMENT"** on every page. Policy *wordings* are real public documents from insurers' websites (see 03 §9.1), used unmodified.

| File | Kind | Content notes |
|---|---|---|
| `acme-benefits-summary.pdf` | benefits_summary | 3 pages; GMC ₹5L floater; employee + spouse + 2 children + parents; room rent 1% of SI; maternity ₹50k; clause on migration to individual policy at exit (page 3, §9.1) |
| `supertopup-schedule.pdf` | policy_schedule | Insured: 5 members; SI ₹5L; aggregate deductible ₹5L; premium ₹14,200; dates; links to a real public super top-up wording (by UIN) |
| `lic-endowment.jpg` | policy_schedule (photo) | Phone photo of a bond first page, slightly angled — shows multimodal robustness |
| `motor-policy.pdf` | policy_schedule | Comprehensive, IDV, renewal 9 Jan |
| `startup-offer-benefits.pdf` | benefits_summary | GMC ₹3L, employee + spouse + children only |
| `parents-migrated-schedule.pdf` | policy_schedule | Individual floater for Suresh & Kamala ₹5L; continuity from 2022; co-pay 20% 61+; room rent 1% |
| `hospital-estimate-angioplasty.jpg` | hospital_estimate | Photo of a printed estimate, line items exactly as in HX-1 (Deluxe ₹9,000 × 4 … total ₹3,46,000), plus a tariff footer listing "Single Standard ₹5,000" |
| `settlement-letter.pdf` | claim_letter | As CX-1: billed ₹3,30,000; approved ₹2,44,640; four deductions |

Create the estimate and letter as realistic hospital/insurer-style layouts (logo placeholders "City Heart Hospital", "Sample Insurer A"), print, and photograph them on a desk for authenticity.

## 4. The 3-minute video (shot list)

Target 2:55. Screen recordings at 1080p from a real phone (Android, Chrome) mirrored, plus two short real-world shots (hospital-like desk, phone in hand). Voice-over in English; the hospital scene in Hindi with English subtitles.

| Time | Beat | On screen | Voice-over / audio | Shows (for judges) |
|---|---|---|---|---|
| 0:00–0:12 | **Hook** | Black → text: "Every Indian family has insurance. Few know what it actually pays." Then a phone at a hospital desk | VO: "45% of corporate employees in India have nothing beyond their employer's cover. They find out at the worst moment." (TATA AIG, Aug 2026) | Problem |
| 0:12–0:40 | **Setup in 25 s** | S04: Rahul speaks one sentence → S05 family card builds → S06 sliders → S07 three documents dropped; facts appear with citation chips; `AgentSteps` "Reading page 14 of 42" → S09 cover map reveals; parents' cells amber "depends on job" | VO: "Rahul tells Kavach about his family in one sentence and drops in what he has. Gemini reads every page and cites every fact." | Multimodal reading, citations, memory |
| 0:40–1:15 | **Moment 1: job change** | S17: "Joining a startup on 1 Dec" → S18 parse → S19: scrubber glides to 1 Dec, parents turn red; diff: + parents' health via migration, − phone cover; ₹7,000 → ₹10,417/mo; dated actions; S20 letter preview, Rahul taps Approve | VO: "Kavach sees what disappears on what date, re-plans inside his budget, and prepares the letter. Rahul approves it." | Planning over time, engine + agents, human approval |
| 1:15–2:20 | **Moment 2: the hero** | Title card "Three months later". Kamala at the desk (real shot), opens Kavach (S09m) → S21 picks Suresh → S22 speaks in Hindi; captions; points camera at the estimate; `AgentSteps`; Kavach answers aloud in Hindi; S23 cards build with ✓ badges; the ₹80,000 saving card; she asks the desk "₹5,000 ka room milega?"; Why panel opened briefly showing §4.2.1 and rule R-HL-001 | Hindi audio with subtitles. Kamala: "Papa ko angioplasty ke liye admit kiya hai…" Kavach: "Pehle parents wali policy ka card dijiye… ₹5,000 wala room maangiye; aapka kharcha lagbhag ₹70,800 hoga…" | Gemini Live voice + vision, Hindi, tools, verification, accessibility |
| 2:20–2:35 | **Moment 3 in one frame** | S31: letter photo → deductions table; "Up to ₹14,560 may be recoverable"; S32 appeal letter with clause quoted | VO: "When the claim is cut, Kavach checks each deduction against the policy and drafts the appeal." | Document reasoning, action |
| 2:35–2:55 | **Proof and scale** | S26 Proof: accuracy on 24 real wordings (live number); architecture diagram (Gemini Pro/Flash/Live, ADK, Cloud Run, Firestore); "India first, Singapore next"; business: employers + licensed partner | VO: "Every number comes from tested rules, every claim is cited and checked, and we measure how well it reads real policies. Kavach: standing beside your family at every insurance moment." | Technical merit, impact, feasibility |

**The one moment that must be flawless:** 1:15–2:20. Record it 5+ times; pick the best real take. If the live model misbehaves on the day, re-record — do not fake audio. State in the README that the video shows the live app.

### Recording checklist
- Demo household reset to each checkpoint before its beat.
- Phone: Do Not Disturb, full brightness, large text off (except Kamala's phone: Large).
- Quiet room for voice; second take with background hospital noise to show robustness (use if clean).
- Captions burned in for the Hindi part.
- Music: soft, royalty-free, ducked under voice.
- Export 1080p, < 3:00, upload to YouTube (unlisted is fine if allowed; else public).

## 5. Deck outline (PDF, ~12 slides)

1. **Title:** Kavach — standing beside your family at every insurance moment. Team, track (BFSI).
2. **Problem:** three moments where families lose money; TATA AIG 45% stat; out-of-pocket share of health spend (sourced); protection gap (Swiss Re). All sourced on-slide.
3. **Who:** Rahul and Kamala (personas), why the hospital desk.
4. **Solution:** household memory + 3 moments (one diagram).
5. **Demo highlights:** 3 screenshots with captions (cover map turning red; hospital cards in Hindi; deduction check).
6. **How the AI works:** agents diagram (03 doc §3), Gemini Live at the desk, verifier, engine computes rupees.
7. **Trust:** citations, verifier, Proof page metrics, "the family decides".
8. **Architecture on Google Cloud:** Cloud Run, Firebase App Hosting, Firestore (vector search), Vertex AI Gemini Pro/Flash/Live, ADK, Cloud Tasks.
9. **Impact:** rupee outcome per test family (Sharma ₹80,000 at the desk + ₹14,560 appeal), who benefits, accessibility (Hindi, voice, older users).
10. **Business model & feasibility:** licensed-partner distribution (Clark/Ditto model), B2B2C employers (job-change continuity), regulation (IRDAI, DPDP), commission-cap context.
11. **Scalability:** rules packs per country (India → Singapore: MediShield Life + Integrated Shield Plans), data rails (AA, Bima Sugam, SGFinDex).
12. **Roadmap & ask.**

Design: use the Kavach design system (07): sand background, indigo headings, marigold accents, Plus Jakarta Sans. Export to PDF.

## 6. Submission checklist (due Sat 18 Oct 2026)

| Item | Owner | Check |
|---|---|---|
| Live link (Firebase App Hosting URL or custom domain) | – | Opens on a phone in ≤ 3 s; "Try with the Sharma family" works logged-out; all 4 checkpoints work |
| Demo video < 3 min | – | Public/unlisted link plays; English; Hindi subtitled |
| Public GitHub repo | – | README with live link, video, architecture diagram, setup instructions, model IDs, eval results, licence; no secrets (run secret scanning) |
| Deck PDF | – | ≤ 12 slides; sources on slides |
| Category | – | BFSI selected (confirm the category mismatch with organisers, see brief.md) |
| Eligibility confirmed | – | India in JAPAC confirmed on Discord/email |
| Cloud Run min instances | – | ≥ 1 through the judging window (19 Oct – 6 Nov) |
| Budget alert | – | GCP budget alert set |
| Disclaimers | – | Visible on Plan, Desk, Landing |
