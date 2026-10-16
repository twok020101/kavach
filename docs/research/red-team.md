# Kavach plan: devil's advocate review

Written Fri 16 Oct 2026, ~19:00 IST, against the plan set in `plan/` plus `game-plan.md`, `brief.md`, `feasibility.md`, `market-scan.md` and `past-winners.md`. This is deliberately one-sided: it lists what can go wrong, not what is good.

## Verdict

**The concept can still score very well. The plan as written cannot ship by Sunday.** Not one line of app code exists (the repo has only the initial commit and the docs), the build schedule assumed a Wednesday start, and the scope is a 3–4 week product: 10 workstreams, 15 agents, 30+ screens, an event-sourced store, 24 hand-labelled policy wordings, Hindi throughout and a live voice agent. Two people plus agents have about 48 hours, part of which goes to the video, the deck and sleep. If the scope isn't cut tonight, the likely outcome is a half-working app and a video stitched together on Sunday, which is a 5–6, not a 10.

The single most important change: **build the hospital scene first and end-to-end, then add everything else only if it's working.**

---

## 1. Time and scope (the biggest risk)

| Problem | Why it matters |
|---|---|
| **No build has started, ~48 h to the deadline** | The 10-build-plan schedule has Wed and Thu rows that never happened. Compressing them "into one day" means doing 3 days of work on Friday night. |
| **Exact cut-off time and time zone still unconfirmed** | If it's Sunday 12:00 IST rather than 23:59, you lose half a day. Find out now. |
| **10 workstreams for 2 humans** | Agents can write code, but humans must review, integrate, deploy, test on a phone, label wordings, verify rules, record a video and make a deck. Integration is the bottleneck, not typing. |
| **Infrastructure built for a real product** | Event sourcing with a projector, a contracts package, monorepo CI, Playwright demo tests, Firestore security-rule tests, a CI grep for ₹ literals. Judges never see any of this. Each piece costs hours. |
| **15 agents** | Judges don't count agents. Five working ones (document reader, estimate reader, desk live agent, claim reader/appeal drafter, life-change parser) cover every beat of the video. |
| **30+ screens** | The video uses about 12. Every extra screen needs Hindi strings, empty/error states and accessibility, per the definition of done. |
| **24 hand-labelled wordings × ~15 fields, two labellers on 5** | Realistically 15–25 person-hours of careful reading. That alone eats one person's whole weekend. |
| **"Never cut" list is too long** | It names the hospital desk, citations + verifier, the engine, the Proof page and demo mode. Only the first is truly unmissable. |

**What a realistic cut looks like:** seeded Sharma household (no live onboarding beyond one document upload to prove reading), the hospital desk live in Hindi with a text-and-photo fallback, the job-change cover map, the claim appeal on the sample letter, and a Proof page from 5–8 labelled wordings, stated honestly. Plain Firestore documents instead of event sourcing. One FastAPI service and one Next.js app.

## 2. The hero number may be wrong (₹80,000)

The whole hospital scene rests on HX-1: proportionate deduction on a ₹9,000 room cuts ₹80,000 from the surgeon, cath lab, nursing and doctor charges.

- **Reported 2024 IRDAI position:** secondary sources describe the 29 May 2024 Health Master Circular as limiting proportionate deduction to room-linked charges, ruling it out for **ICU** charges, and ruling it out where the hospital **doesn't bill differently by room category** ([Ditto](https://www.joinditto.in/articles/health-insurance/proportionate-deduction-in-health-insurance/), [Outlook Money](https://www.outlookmoney.com/spotlight/financehub/the-three-lines-in-your-health-policy-that-decide-how-much-you-actually-get-paid), [PersonalFN](https://www.personalfn.com/dwl/health-insurance-holders-to-benefit-from-irdais-proposal-on-proportionate-deduction)). These are not primary sources; the circular text must be checked.
- **The engine contradicts itself.** HX-1 assumes the surgeon and cath lab charges *don't change* with the room ("conservative"). If they don't change, the reported rule says the insurer can't apply proportionate deduction to them, and most of the ₹80,000 disappears. Either the hospital bills by room category (then Option B's charges are lower, and the example must show it) or it doesn't (then the deduction mostly doesn't apply).
- **R-HL-002 (proportionate deduction on ICU) is probably wrong** under the reported rule and should not be in the engine unless the circular says otherwise.
- **Angioplasty is often a package rate** at network hospitals, where room-linked deductions behave differently. The plan's own "ask the desk" card hints at this.

Anyone on the jury with insurance experience can spot this, and it lands on the one moment that "must be flawless". **Before any code, someone reads the master circular and the chosen wording's clause, then rebuilds HX-1 so the saving is legally sound.** A smaller correct number beats a big wrong one. CX-1 (the claim appeal) also depends on R-HL-001 and needs the same check.

## 3. The live hospital agent (technical risk on the hero)

| Risk | Detail |
|---|---|
| **Audio+video sessions are capped at ~2 minutes without compression** | Live API docs say audio-video sessions last about 2 minutes and connections about 10 minutes unless context window compression is on ([Live API sessions](https://ai.google.dev/gemini-api/docs/live-session), [Firebase limits](https://firebase.google.com/docs/ai-logic/live-api/limits-and-specs)). The plan mentions compression but the 1 fps camera stream burns ~258 tokens/s. Send frames only when the user points the camera, and test a full 3-minute scene early. |
| **Verifier latency on every card** | `emit_card` is "verified before render" with Pro. That's several seconds per card × 3–4 cards while an anxious mother waits. Verify the engine numbers deterministically; reserve the Pro check for free text. |
| **Number check on Hindi transcripts** | The after-turn check compares spoken numbers with tool outputs. Hindi transcription may write "सत्तर हज़ार आठ सौ", "70,800" or "sattar hazaar". Matching will be flaky and could trigger false "spoken corrections" on camera. |
| **Hindi voice quality and code-mixing** | Native-audio Hindi with English insurance words is plausible but unproven for this team. Audition it in the first hour, not on Saturday. |
| **Proxying audio through Cloud Run** | ADK `run_live` behind a Cloud Run WebSocket: set the request timeout (default 5 min), session affinity and min instances, or the socket drops mid-demo. iOS Safari mic and autoplay quirks are a separate time sink. |
| **Model and region availability** | The plan pins model IDs "on build day". The live native-audio model on Vertex may be preview-only or region-limited. Check now, since it decides whether the hero works at all. |
| **Fallback is thin** | Text-and-photo mode is listed for Saturday. It should exist on Friday night: it's what the judges will most likely use. |

## 4. What the judges will actually experience

- **Most judges will watch the video and skim the deck; some will click the link on a laptop.** On a laptop, with no hospital estimate in hand, the hero scene is hard to try. Needed: a "Try the hospital scene" button that loads the sample estimate image and runs the desk in text or voice in under a minute.
- **The video is overloaded.** Hook, setup, job change, hospital, claim and proof in 2:55 means 25–35 seconds per beat. The hero gets 65 seconds, much of it in Hindi with subtitles for a JAPAC (largely non-Hindi) jury. Consider giving the hospital 90 seconds and cutting setup to a 10-second montage.
- **"Kamala at the desk (real shot)"** needs a Hindi-speaking person of about that age on camera by Saturday, a hospital-like set, printed and photographed sample documents, and 5+ good live takes. Nobody owns this today.
- **The Gen AI story can read as "rules engine with a voice".** Deliberately computing every rupee in Python is right for trust, but the deck must make the AI's work visible (reading 40-page wordings, the estimate from a photo, choosing what to ask, drafting the appeal). Otherwise the 40% criterion is undersold.
- **Judging window 19 Oct – 6 Nov:** the live link must survive three weeks. Live API minutes cost money, the link is public, and there's no rate limit or abuse protection in the plan beyond a budget alert. A runaway bill or a quota error mid-judging both mean a broken demo.

## 5. Realism of the story

- **Would a frightened 58-year-old open an app at the admission desk, pick the patient and film an itemised estimate?** Judges will ask. Many admissions are emergencies, and many estimates are a single package figure, not line items by head. The story is strongest for a *planned* procedure; say so in the video ("Suresh's angioplasty is scheduled for Monday").
- **A Hindi-speaking mother in a Bengaluru family** is fine, but say she moved from the north, or a Kannada-speaking judge may find it odd.
- **The super top-up does nothing in either scene.** It sits below its ₹5L deductible every time. It adds complexity to the demo without paying off.
- **The job-change moment is a planner, the weakest of the three**, and it eats 35 seconds. It's also the moment most like what other teams will build (finance planner with a chart).

## 6. Rules still unverified

Workstream J ("a person signs off every VERIFY rule") hasn't started, and it gates the hero (R-HL-001/002/006), the job change (migration window, R-HL-008) and the claim appeal (R-CLM-002, R-CLM-007). If they aren't verified, the UI shows "Check with your insurer" on the very numbers the demo celebrates. The sourced claim-deduction statistic for the deck is also still "to find".

## 7. Admin items that can still sink the entry

- **Eligibility (India in JAPAC) and the submission category mismatch are still unconfirmed.** Ask on Discord or support+aibuildercup@hack2skill.com today.
- **"Fresh projects only, built during the hackathon window."** Fine, but keep commit history honest and visible.
- **Public repo with real insurer wordings:** store the manifest and fetch script, not the PDFs, as the plan already says. Make sure that's actually done.
- **Secrets:** a rushed weekend is when API keys get committed. Run secret scanning before making the repo public.

## 8. The business, briefly (for the deck, not this weekend)

- **Frequency:** the hospital desk happens once every few years per family. Hard to build a habit or a subscription on it.
- **Who pays:** the broker model (commission) puts Kavach on the selling side, which undercuts "the agent that stands beside your family". The employer pitch is weak for the job-change moment, because the employee is *leaving* that employer. IRDAI's proposed commission caps (Sep 2026) squeeze the broker model further.
- **Moat:** "household memory" is only a moat once families upload policies, which they rarely do; Policybazaar, Ditto and insurers' own apps already hold that data.
- **Liability:** a wrong rupee figure spoken at a hospital desk is a real-world harm. The deck should show the safety controls, not just mention them.

A judge asking "who pays and how often?" needs a crisp two-line answer on the business slide.

---

## If I had to pick five things to do tonight

1. **Confirm the submission cut-off, eligibility and category** with the organisers.
2. **Verify the proportionate-deduction rule from the master circular and fix HX-1/CX-1** before building the engine around them.
3. **Spike the live desk in Hindi end to end** (Cloud Run WebSocket, a 3-minute audio-and-camera session, the estimate photo, one engine call) before anything else is built.
4. **Cut scope to the hero-first list in §1** and drop event sourcing, the contracts package and most agents.
5. **Book the people and props for the video** (who plays Kamala, the printed estimate, the set) now, not Saturday.
