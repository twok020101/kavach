# Kavach: how we close each red-team risk

Written Fri 16 Oct 2026, ~19:30 IST, as the answer to [red-team.md](red-team.md). For every risk raised there, this says how we close it, who owns it and which plan doc has to change. The existing plan docs are **not** edited yet; §9 lists the edits.

Kshitij's position is taken as given: two people plus Claude agents running overnight can build the full plan, so nothing below cuts scope to save time. What it does change is **order** (hero first, everything else layered on a working spine) and **facts** (the hero number was legally wrong and is rebuilt here). It also fits in the new WhatsApp channel.

---

## 1. Verdict in five lines

1. **The ₹80,000 hero number was wrong as built, and the rebuilt one is ₹90,000.** The rule allows proportionate deduction only on charges the hospital bills differently by room category. So the fix is to show the hospital's room-category tariff, and Option B's surgeon, cath-lab, nursing and doctor charges come down with the room. §3 has the rebuilt HX-1 and CX-1. CX-1's ₹14,560 survives.
2. **R-HL-002 (proportionate deduction on ICU) is the wrong way round.** ICU charges are exempt from proportionate deduction. It becomes a rule that *protects* the family, plus a new claim-check rule.
3. **The WhatsApp bot helps more than it hurts if it is the same agent behind a second door, not a second product.** It *is* the "text-and-photo fallback" the red team said was thin, it answers the "would a 58-year-old open an app?" objection, and it gives the job-change moment a real proactive nudge. It must not replace the live desk as the hero, because the live voice-and-camera agent is our strongest Gen AI (40%) and innovation (25%) evidence.
4. **Time:** full scope is plausible only if the build is run as layers on a working spine with freeze points. Agents remove typing, but six jobs only humans can do (rules sign-off, casting and filming, phone testing, deck, submission admin, integration review) add up to roughly 20 to 25 person-hours, and they are on the critical path. §6 lists them.
5. **Still open and only Kshitij can close it:** the exact submission cut-off time and time zone, eligibility, and the category. Public listings agree on Sun 18 Oct but none gives a time.

---

## 2. Where the WhatsApp bot fits

### What it is
The **same Kavach agent and engine**, reached through WhatsApp instead of the app. People send a Hindi voice note, a photo of the estimate or settlement letter, or text. Kavach replies with a Hindi voice note, a short text and a card image, plus a link that opens the full card in the app. It is not a live call; it is message-and-reply.

### How it fits each moment

| Moment | WhatsApp role | Why it is worth it |
|---|---|---|
| **Hospital desk (hero)** | **Fallback door.** If the app won't open (no data for a PWA, unfamiliar phone, low battery), Kamala sends a voice note and a photo of the estimate to Kavach's WhatsApp. She gets the same answer, as a Hindi voice note and a card. | Closes red-team §3 "fallback is thin" and §5 "would she open an app?". Reuses the estimate reader, engine and Hindi answer, so the only new code is the channel adapter. |
| **Household alert** | When Kamala uses Kavach (either door), Rahul gets a WhatsApp message: "Mummy is at City Heart Hospital. Kavach told her to ask for the ₹5,000 room. Tap to see." | This is the one place "household memory" visibly pays off in the hero scene, and it costs one outbound message. |
| **Job change** | Dated nudges such as "15 Nov: ask Acme HR to migrate Mummy and Papa's cover. The letter is ready, reply YES to send it to you as a PDF." | Turns the weakest moment (a planner) into an agent that acts on a date. |
| **Claim appeal** | Forward the settlement letter photo; get back the deductions verdict and the appeal letter PDF. | Realistic: insurers already send settlement letters on WhatsApp in India. |

### What it does to each red-team risk

| Red-team risk | Effect | Net |
|---|---|---|
| §1 Scope and integration | Adds one webhook, one media download, one text-to-speech step and template messages. Small *only if* the agent is channel-agnostic (one `answer(household, inputs) → {text, speech, card}` call used by the app and WhatsApp). If it is built as a separate bot with its own logic, it doubles the testing. | Slightly worse, contained by the shared core |
| §3 Live agent fragility | A non-live path that doesn't depend on the 2-minute video cap, the Cloud Run WebSocket, or iOS Safari's mic. If the live desk misbehaves during judging, the scene still works. | **Better** |
| §4 Judges trying it | Judges mostly use laptops, and WhatsApp needs a phone and a join step (below). It does not replace the "Try the hospital scene" button. | Neutral |
| §4 Video length | Needs about 8 to 10 seconds of screen time (see §5 here). | Slightly worse, manageable |
| §4 Abuse and bill | A public number is another way in. Rate-limit per sender. | Slightly worse |
| §5 Realism | Strong answer to "a frightened 58-year-old won't open an app": she uses the app her son set up, or the WhatsApp she already uses. | **Much better** |
| §8 Frequency ("once every few years") | Renewal dates, migration deadlines and claim status give a reason to talk more than once every few years. | **Better** for the deck |
| Privacy (DPDP) | Health data passes through Meta or a provider. Needs explicit consent on first message, no storage of media beyond processing, and a deck line on it. | Worse; needs one consent step |

### Practical constraints (checked)

- **Who can message it.** Meta's Cloud API test number sends free messages to **at most 5 pre-verified recipient numbers** ([Meta get started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/)). A public production number needs business verification, which won't land by Sunday. For **judges**, use the **Twilio WhatsApp Sandbox**: anyone can join by scanning a QR code that sends a join code; membership lasts 3 days, then they rejoin; it sends at most one message every 3 seconds; custom templates aren't allowed ([Twilio sandbox](https://www.twilio.com/docs/whatsapp/sandbox)). Recommendation: **Meta test number for the video (looks like a real business chat), Twilio sandbox QR on the landing page and README for judges**, both pointing at the same webhook.
- **24-hour window.** Free-form replies are allowed only within 24 hours of the user's last message; anything proactive needs an approved template. For the demo, Rahul and Kamala's numbers message the bot first. The proactive "15 Nov" nudge is shown in the video, and in the sandbox it only works inside the window. Say so honestly in the README.
- **Meta's 2026 policy on AI chatbots.** Since 15 Jan 2026, the WhatsApp Business Solution bars *general-purpose* AI assistants; business-specific bots (customer service, bookings, notifications) stay allowed ([respond.io summary](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban), secondary source). Kavach is an insurance-specific service, so it fits, but its WhatsApp copy must stay on insurance and decline off-topic chat.
- **Voice in, voice out.** Voice notes arrive as OGG/Opus audio. Gemini takes audio directly for understanding Hindi, and a Gemini text-to-speech model produces the Hindi reply as a voice note. Speak only text generated from engine output (same rule as the live desk).
- **Google requirement.** Still met: Gemini does all the AI and the webhook runs on the same Cloud Run service.

### What not to do
- Don't make WhatsApp the hero. The red team's §4 point about the Gen AI story ("rules engine with a voice") would get worse: a chat bot with voice notes looks like what many Indian insurers already run. The live agent that sees the estimate and talks back is the novel part.
- Don't build onboarding or the cover map in WhatsApp. It is a door for the three moments only.

---

## 3. The hero number (red-team §2), checked and rebuilt

### What the rule actually says

| Point | Status | Source |
|---|---|---|
| Proportionate deduction is **not** applied to **ICU charges**, because ICUs don't come in room categories | **Confirmed** | IRDAI circular IRDAI/HLT/REG/CIR/151/06/2020, as quoted in [Business Standard](https://www.business-standard.com/article/companies/out-of-pocket-expenses-of-policyholders-to-fall-after-new-irdai-guidelines-120061200007_1.html) and reproduced in insurers' own filed wordings, e.g. [New India Assurance](https://icsi.newindia.co.in/NIAICSI/Images/Documents/ICSITandC-Health.pdf), [Aditya Birla Activ Care](https://www.adityabirlacapital.com/healthinsurance/assets/PDF/20250627T083542.pdf) |
| Proportionate deduction is **not** applied at hospitals that **don't follow differential billing**, or to **any expense not billed differently by room category**; this must be stated in the policy terms | **Confirmed** | Same circular and wordings |
| It is **not** applied to pharmacy, consumables, implants, medical devices or diagnostics | **Confirmed** (already in R-HL-001) | Standardisation guidelines; same wordings |
| The 29 May 2024 Health Master Circular keeps these rules | **Reported, not read** | Secondary sources say so ([Ditto](https://www.joinditto.in/articles/health-insurance/proportionate-deduction-in-health-insurance/), [Outlook Money](https://www.outlookmoney.com/spotlight/financehub/the-three-lines-in-your-health-policy-that-decide-how-much-you-actually-get-paid)). The regulator's site was blocked from both the cloud and Kshitij's machine, so **a human needs to open the [circular PDF](https://irdai.gov.in/documents/37343/365525/%e0%a4%b8%e0%a5%8d%e0%a4%b5%e0%a4%be%e0%a4%b8%e0%a5%8d%e0%a4%a5%e0%a5%8d%e0%a4%af+%e0%a4%ac%e0%a5%80%e0%a4%ae%e0%a4%be+%e0%a4%b5%e0%a5%8d%e0%a4%af%e0%a4%b5%e0%a4%b8%e0%a4%be%e0%a4%af+%e0%a4%aa%e0%a4%b0+%e0%a4%ae%e0%a4%be%e0%a4%b8%e0%a5%8d%e0%a4%9f%e0%a4%b0+%e0%a4%aa%e0%a4%b0%e0%a4%bf%e0%a4%aa%e0%a4%a4%e0%a5%8d%e0%a4%b0+_+Master+Circular++on+Health++Insurance+Business++29052024.pdf/5e707a91-b5de-1ec1-cf18-b66273a6839d?t=1716962621002&version=1.0) and copy the paragraph number** into the rules pack (5 minutes) |
| With several policies, the insured chooses which to claim from first, and insurers coordinate the balance (R-HL-006) | **Reported** | Secondary summaries of the 2024 master circular ([ArthGyaan](https://arthgyaan.com/blog/understanding-latest-irda-master-circular-on-health-insurance-2024.html), [BW](https://businessworld.in/article/irdais-master-circular-empowering-health-insurance-521362)); confirm in the same PDF |

**So the red team was right:** the old HX-1 assumed the surgeon and cath-lab charges don't change with the room. Under the rule, unchanged charges can't be cut, and the ₹80,000 disappears.

### Rule changes

| Rule | Old | New |
|---|---|---|
| R-HL-001 | Ratio applied to "associated heads" | Ratio applied **only to heads the hospital's tariff prices by room category**, and only if the hospital follows differential billing. Excluded always: pharmacy, consumables, implants, devices, diagnostics, ICU |
| R-HL-002 | Proportionate deduction on ICU | **Replaced:** "ICU charges are never proportionately deducted." ICU rent is still capped at the wording's ICU limit, if it has one, but nothing else is cut because of it |
| R-HL-010 (new) | – | Billing type unknown → the engine computes **both** branches and the agent asks the desk one question before giving a single number |
| R-CLM-008 (new) | – | Proportionate deduction applied to ICU charges, or at a hospital without differential billing → **challengeable** |

### Rebuilt HX-1 (City Heart Hospital, planned angioplasty, 4 days)

The printed estimate carries the hospital's **room-category tariff**, which is common in Indian private hospitals and is exactly what Gemini reads from the photo. The patient, policies, co-pay and room limit are unchanged.

| Head | Deluxe ₹9,000 (Option A) | Single Standard ₹5,000 (Option B) | Priced by room? |
|---|---:|---:|---|
| Room × 4 days | 36,000 | 20,000 | – |
| Nursing & RMO × 4 | 8,000 | 6,000 | yes |
| Surgeon / procedure | 1,20,000 | 90,000 | yes |
| Cath lab / OT | 40,000 | 26,000 | yes |
| Doctor visits | 12,000 | 8,000 | yes |
| Stent (implant) | 45,000 | 45,000 | no |
| Pharmacy & consumables | 55,000 | 55,000 | no |
| Diagnostics | 24,000 | 24,000 | no |
| Non-payable items | 6,000 | 6,000 | excluded |
| **Bill** | **3,46,000** | **2,80,000** | |

**Option A (Deluxe):** room payable 20,000 (₹16,000 over the limit); room-priced heads 1,80,000 × 5,000/9,000 = 1,00,000 (**deduction ₹80,000, now legal because these heads are priced by room**); other heads 1,24,000. Admissible 2,44,000. Co-pay 20% = 48,800. Policy pays 1,95,200. **Out of pocket ₹1,50,800.**

**Option B (Standard):** admissible 20,000 + 1,30,000 + 1,24,000 = 2,74,000. Co-pay 54,800. Policy pays 2,19,200. **Out of pocket ₹60,800.**

**Headline: ₹90,000 less to pay by asking for the ₹5,000 room.** Of that, ₹66,000 is the lower bill and the rest is the deduction and room excess Kamala avoids, partly offset by a higher co-pay on the larger approved amount. The Why panel shows this split, which is more convincing to an insurance-literate judge than a single number.

**If the hospital doesn't bill by room** (R-HL-010 branch): no deduction on the procedure heads. Option A out of pocket = 3,46,000 − 0.8 × 3,24,000 = ₹86,800; Option B = 3,30,000 − 0.8 × 3,24,000 = ₹70,800. Saving: only the **₹16,000** room difference. Kavach says this out loud instead of inventing a bigger number. Showing this branch for two seconds in the Why panel is strong evidence of grounding.

**If it's a package rate:** Kavach doesn't apply the ratio itself. It asks the desk for the package price in the ₹5,000 category and tells Kamala to confirm with the TPA desk.

**Spoken line (Hindi, built from engine output):** *"Pehle parents wali policy ka card TPA desk par dijiye. ₹9,000 wale room mein doctor aur operation ke charges bhi zyada hain, aur insurance unpar katauti karega. Aapko lagbhag ₹1,50,800 dene padenge. ₹5,000 wala room maangiye, tab lagbhag ₹60,800. Sign karne se pehle TPA desk se confirm kar lijiye."*

**Super top-up (red-team §5):** it still never pays in this scene (deductible ₹5,00,000). Keep it in the household for the job-change map, where "top-up without base" is a real finding, and give it one spoken line here: "Top-up policy tabhi kaam aayegi jab is saal ka kharcha ₹5 lakh se upar jaaye, isliye saare bill sambhal kar rakhiye." No card.

### Rebuilt CX-1 (claim appeal)

Bill ₹2,80,000 (Option B). Deductions: non-payable 6,000 (valid), "proportionate deduction" 9,600 (challengeable: the room was within the limit), consumables 8,600 (possibly). Co-pay 20% × (2,80,000 − 24,200) = 51,160. **Approved ₹2,04,640.** Recoverable: 9,600 × 0.8 + 8,600 × 0.8 = **₹14,560 (unchanged)**, and ₹2,04,640 + ₹14,560 = ₹2,19,200, the engine's expected payout in Option B. Everything ties out.

---

## 4. Every red-team risk and how we close it

### §1 Time and scope

| Risk | How we close it | Owner |
|---|---|---|
| No build yet, ~48 h left | Build as **layers on a spine**. Layer 0 (tonight): hero path end to end, from estimate photo to engine to Hindi answer, in the app and on WhatsApp, deployed. Layer 1 (Sat morning): live voice desk. Layer 2 (Sat): claim appeal, job-change map. Layer 3 (Sat night): onboarding, Proof page, polish. Each layer ships deployed; nothing starts until the layer below works on a phone. This keeps the full scope but guarantees a demo at every hour. | Kshitij |
| Cut-off time unknown | Read it from the hack2skill dashboard tonight and plan backwards from **cut-off minus 6 hours** (video, deck, submission). | Kshitij |
| 10 workstreams for 2 humans | Agents work only on modules with a written input/output contract and their own tests (engine, estimate reader, WhatsApp adapter, screens on fixtures). Humans own **integration gates** at 4 fixed points (§6), not continuous review. | Both |
| Real-product infrastructure | Defer what judges never see, without cutting what they do see: plain Firestore documents instead of event sourcing, one FastAPI service, one Next.js app, no contracts package. The ₹-literal guard becomes one unit test. Event sourcing goes on the roadmap slide. | Plan change (02, 04, 10) |
| 15 agents | Build the 5 that carry the video first (document reader, estimate reader, desk live agent, claim reader and appeal drafter, life-change parser). The other 10 are Layer 3. | 03 |
| 30+ screens | The ~12 in the video plus WhatsApp first. The rest are Layer 3, English-only if needed, with Hindi only on desk and WhatsApp screens. | 08 |
| 24 hand-labelled wordings | Run the Proof page on **8 labelled wordings** and say "8" honestly; add more overnight if agents pre-fill labels and a human only checks them (about 10 minutes each instead of 45). | Jai |
| Long "never cut" list | One item is unmissable: the hero scene **with a correct number**. Everything else is layered. | – |

### §2 The hero number
Closed in §3 above. Owner: whoever owns the engine; a human signs off R-HL-001/002/010 and R-CLM-008 against the circular paragraph.

### §3 The live hospital agent

| Risk | How we close it |
|---|---|
| Audio+video capped at ~2 min | **Don't stream video.** The estimate photo goes through the estimate reader (a normal Gemini call), and its result is passed into the Live session as a tool result. The Live session stays **audio-only**, which is capped at 15 minutes ([Firebase Live API limits](https://firebase.google.com/docs/ai-logic/live-api/limits-and-specs)). Also turn on context-window compression and session resumption. The camera still appears on screen, so the judge-visible experience is unchanged. |
| Verifier latency per card | Engine numbers are deterministic, so cards render instantly with the ✓ from the engine trace. The Pro verifier checks only free text (the appeal letter, explanations), off the live path. |
| Number check on Hindi transcripts | Drop transcript matching from the live path. The engine returns each amount pre-formatted as Hindi words and digits, and the agent must speak the tool's `say` string. Transcript checks run offline for the Proof page. |
| Hindi code-mixed voice unproven | First task tonight: a 20-minute voice audition (two voices, five lines from the script with English insurance words). Pick the voice before writing the prompt. |
| Cloud Run WebSocket | Request timeout 3600 s, session affinity on, min instances 1, max instances capped. Demo and film on Android Chrome; iOS is out of scope for the video. |
| Model and region availability | First-hour check: list the live native-audio models available on Vertex in our region. If preview-only or absent, use the Gemini Developer API path (Firebase AI Logic supports Live), which is still Google and still qualifies. |
| Thin fallback | **Two fallbacks now exist:** text-and-photo in the app and the WhatsApp door, both from the same core and both in Layer 0. |

### §4 What judges experience

| Risk | How we close it |
|---|---|
| Laptop judges can't try the hero | A **"Try the hospital scene"** button on the landing page loads the sample estimate and runs the desk by text or mic in under a minute. A second card shows the WhatsApp sandbox QR code for judges holding a phone. |
| Video overloaded | New timing: hook 10 s, setup montage 10 s, job change 25 s (ending in the WhatsApp nudge), **hospital 90 s** (live desk with WhatsApp shown for ~8 s as "no app? same answer on WhatsApp" and Rahul's alert), claim 15 s, proof 25 s. |
| Kamala on camera | WhatsApp makes this easier: hands-and-phone shots and a real Hindi voice need no face. Book one Hindi-speaking older relative or friend for 2 hours on Saturday afternoon. Print and photograph the estimate tonight. |
| "Rules engine with a voice" | Deck slide 6 and the video's proof beat name what Gemini actually does: reads the room-category tariff from a photo, decides whether the deduction can apply, picks the one question to ask the desk, understands a Hindi voice note, and drafts the appeal citing the clause. The new R-HL-010 branch is the best evidence: the AI decides *which* rule applies from what it reads. |
| Link must survive 19 Oct – 6 Nov | Per-IP and per-WhatsApp-number limits, a 5-minute cap per live session, a daily live-minutes ceiling stored in Firestore that switches the desk to text mode when hit, a GCP budget alert, and Cloud Run min instances 1. |

### §5 Realism

| Point | Fix |
|---|---|
| Would she open an app? | She uses either door. In the video Kamala opens the app Rahul installed; the WhatsApp door appears as the fallback. |
| Emergencies and package estimates | Script says "Papa ki angioplasty Monday ko scheduled hai" (planned). The package branch is handled (§3). |
| Hindi speaker in Bengaluru | One line in the setup: Kamala and Suresh moved from Lucknow to live with Rahul. |
| Super top-up does nothing | One spoken line, no card (§3). |
| Job change is the weakest | It now ends with an action on a date (the WhatsApp nudge and the migration letter), not a chart. |

### §6 Rules still unverified

| Rule | Status after this check | Remaining step |
|---|---|---|
| R-HL-001 | Corrected, confirmed on the 2020 circular and filed wordings | Copy the 2024 paragraph number |
| R-HL-002 | Wrong; replaced | Same |
| R-HL-006 (choice of policy) | Reported in secondary summaries | Confirm in the 2024 PDF |
| R-HL-007 (PED waiting max 36 months) | Not checked here | Confirm |
| Migration window (job change) | Not checked here | Confirm, or keep "check with HR" on screen |
| R-CLM-002, R-CLM-008 | Supported by the same circular | – |
| R-CLM-007 (grievance timelines) | Not checked here | Confirm, or show "within the regulatory period" without days |

The engine should show "Check with your insurer" only on rules still marked VERIFY, and **none of the hero's rules should be in that state** after the 5-minute PDF check.

### §7 Admin

| Item | Fix | Owner |
|---|---|---|
| Cut-off time, eligibility, category | Dashboard tonight; Discord or support+aibuildercup@hack2skill.com if unclear | Kshitij |
| Honest commit history | Commit small and often; no squashing | Both |
| Wordings in a public repo | Manifest and fetch script only | Jai |
| Secrets | GitHub secret scanning on before the repo goes public. **New with WhatsApp:** Meta and Twilio tokens and the webhook verify token go in Secret Manager, never `.env` in git. Verify webhook signatures. | Both |

### §8 Business (deck only)

| Question | Two-line answer |
|---|---|
| Who pays and how often? | Employers pay a per-employee monthly fee for "family cover continuity": exit migration, the hospital desk and claim help for parents. Later, a licensed partner earns advice fees, not product commission. |
| Frequency | WhatsApp carries the year-round touches (renewals, migration deadlines, claim status); the hospital desk is the moment that earns the trust. |
| Moat | Households don't upload policies, so Kavach gets them where families already are: forwarded on WhatsApp. Account Aggregator and Bima Sugam come later. |
| Liability | Every spoken rupee comes from a tested rule with a citation; uncertain branches are said out loud (§3); "confirm with the TPA desk" closes every answer. |

---

## 5. Hospital beat, revised (90 s)

| Time | On screen | Purpose |
|---|---|---|
| 0:00–0:08 | "Papa's angioplasty is on Monday." Kamala at the desk with the printed estimate | Planned procedure |
| 0:08–0:50 | App desk mode: she speaks in Hindi, points the phone at the estimate, Kavach answers aloud; cards build: "₹9,000 room: about ₹1,50,800. ₹5,000 room: about ₹60,800." | Live voice + vision (Gen AI) |
| 0:50–1:00 | Why panel: the tariff columns highlighted, "deduction applies because these charges change with the room", clause and rule IDs | Grounding |
| 1:00–1:08 | Phone with the app closed: same photo plus a voice note on WhatsApp, Hindi voice-note reply arrives | Fallback door, realism |
| 1:08–1:18 | Rahul's phone in a meeting: WhatsApp alert, he taps through to the cards | Household memory |
| 1:18–1:30 | Kamala asks the desk "₹5,000 wala room milega?"; desk nods | Outcome |

---

## 6. The human-only work (the real critical path)

Agents can't do these. Rough hours:

| Job | Hours | When |
|---|---|---|
| Rules sign-off (open the circular, copy paragraphs, check the 6 rules above) | 2 | Tonight |
| Voice audition and Hindi script check | 1 | Tonight |
| Print and photograph the estimate and settlement letter | 1 | Tonight |
| Integration gates (4 × ~1.5 h: Layer 0 tonight, Layer 1 Sat 10:00, Layer 2 Sat 18:00, freeze at cut-off minus 8 h) | 6 | Fixed times |
| Filming (Kamala, Rahul, WhatsApp shots, 5+ takes) and edit | 6 | Sat afternoon and evening |
| Deck (12 slides) | 3 | Sat night |
| Phone testing, WhatsApp sandbox test with a fresh number, submission form | 2 | Sun |
| **Total** | **~21** | Across two people, alongside sleep |

This is the honest limit on "build everything": it fits, but only if these slots are booked now and nothing new is added after Saturday 18:00.

---

## 7. First things to do tonight (in order)

1. Confirm the cut-off time on the dashboard.
2. Open the 2024 master circular and copy the proportionate-deduction and multiple-policy paragraph numbers (5 minutes).
3. First-hour checks: Live native-audio model and region; Hindi voice audition; Meta test number and Twilio sandbox both reach one webhook.
4. Layer 0: estimate photo → engine (new HX-1) → Hindi answer, in the app and on WhatsApp, deployed.
5. Book the Saturday filming slot and the person playing Kamala.

---

## 8. What changes from the original red-team list of five

| Red team said | We now say |
|---|---|
| Confirm cut-off, eligibility, category | Same |
| Verify the rule and fix HX-1/CX-1 | Done here, except copying the 2024 paragraph number |
| Spike the live desk in Hindi | Same, but audio-only with the photo going through the estimate reader, which removes the 2-minute cap |
| Cut scope to a hero-first list | **Keep the scope, order it as layers**, and defer only infrastructure judges can't see |
| Book people and props | Same; WhatsApp makes casting easier (no face needed for half the shots) |

---

## 9. Plan docs that need to change (not edited yet)

| Doc | Change |
|---|---|
| 01 Product | Add the WhatsApp door to the three moments and the requirements; Kamala and Suresh moved from Lucknow; hero is a planned procedure |
| 02 Architecture | Webhook route on the Cloud Run service; channel-agnostic `answer()` core; Secret Manager for Meta/Twilio; plain Firestore instead of event sourcing; Live session audio-only |
| 03 Gemini and agents | Voice-note understanding and Hindi TTS reply; estimate reader feeds the Live session as a tool result; verifier off the live path; `say` strings from the engine; WhatsApp scope guard (insurance only) |
| 04 Data model | Drop the event store for the hackathon; add channel, consent and WhatsApp number to the household member |
| 05 Rules engine | R-HL-001 rewritten, R-HL-002 replaced, R-HL-010 and R-CLM-008 added; HX-1 and CX-1 replaced with §3 numbers; tariff-by-room-category input |
| 06 API | WhatsApp webhook (verify, receive, send), media download; template message for the household alert |
| 08 Screens | Landing: "Try the hospital scene" and sandbox QR; Why panel shows the billing branch; WhatsApp message designs (card image, voice note) |
| 09 Demo script | Revised hospital beat (§5), new timings, new numbers (₹1,50,800 / ₹60,800 / ₹90,000; ₹2,80,000 bill; ₹2,04,640 approved); sample estimate carries the room-category tariff |
| 10 Build plan | Layers and integration gates (§4, §6) instead of the Wed–Sun table |
| 11 Trust and compliance | WhatsApp consent and media retention; rule-verification table updated |
| README | Hero numbers and the WhatsApp channel |
