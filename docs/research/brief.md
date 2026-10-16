# Kavach: hackathon brief

Working name **Kavach** ("shield"). A household safety-net planner for Indian families: it remembers the family, its money and its policies, recommends the insurance mix they can afford, and re-plans whenever life changes.

Version 2, 14 Oct 2026. Revised for the long-term business vision. Rule details were checked on aibuildercup.com that day.

---

## 1. Hackathon facts

| Item | What the site says |
|---|---|
| Name / organizer | Google Cloud AI Builder Cup 2026. Hack2skill runs it, sponsored by Google Cloud |
| Theme | AI solutions for real problems in the **JAPAC** region, built on Google Cloud |
| Our track | **BFSI: Intelligent Risk, Fraud & Financial Experiences**. Its scope names *insurance* and "personalized, informed financial experiences" outright, so Kavach fits it directly |
| Eligibility | Working professionals, entrepreneurs, startups in JAPAC. **Age 21+. No students**, and they can disqualify a team even after shortlisting |
| Team | **2 to 4 members, no solo entries.** One team and one theme per person |
| Format | Build online. Shortlisted teams send 2 members to an in-person Demo Day in **Singapore**, with flights and stay sponsored |
| Timeline | Registration closed **11 Oct** · Team formation closes **14 Oct (today)** · **Prototype deadline 18 Oct** · Evaluation 19 Oct to 6 Nov · Finalists 7 Nov · Finale 4 Dec |
| Original work | Only work built during the hackathon window counts |
| Required tech | Google AI models (Gemini / Gemma) or Google agentic platforms (Agent Platform, Antigravity, AI Studio). **Deployed on Cloud Run or Firebase.** Projects built mainly on another cloud are ineligible |
| Submission | (1) working **deployed link**, (2) **demo video under 3 min** (YouTube, Vimeo or public Drive), (3) **public GitHub repo**, (4) **deck as PDF** covering problem, impact, feasibility, scalability. Everything in English |
| Judging | **Technical merit & Gen AI implementation 40%** · Problem alignment & impact 25% · Innovation & creativity 25% · UX & solution design 10% |
| Prizes (USD) | Winner 10k · 1st runner-up 7k · 2nd runner-up 5k · Best use of Google Cloud AI 2k · Most impactful 2k · Social choice 2k · Best UI/UX 2k |

Sources: [Overview](https://aibuildercup.com/index.html) · [Themes & requirements](https://aibuildercup.com/themes.html) · [FAQ](https://aibuildercup.com/Faqs.html) · [Prizes](https://aibuildercup.com/rewards.html) · [Terms](https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub) · [Registration](https://hack2skill.com/event/aibuildercup2026/registration) · support+aibuildercup@hack2skill.com · [Discord](https://discord.gg/x5GRzJbKpa)

**Check these first:**
- **Registration and team.** Registration closed 11 Oct and team changes close today. Kavach can only be submitted by a registered team of 2 to 4 non-students.
- **India.** The FAQ says "JAPAC" but has no country list. Google Cloud usually counts India in JAPAC. Confirm on Discord or by email.
- **Category wording.** The submission section lists "Healthcare, Education, Sustainability…", which doesn't match the six themes. Choose **BFSI** and confirm with the organizers.

**What scoring tells us:** 65% of the score is Gen AI depth plus innovation. A form with a chatbot attached will lose. The AI has to do real work: read documents, infer context, choose which question to ask, and reason about money over time. It must also be live, deployed, and run end to end.

---

## 2. What we're building, and why it's a business

**Kavach is a household safety-net planner that remembers.** It keeps a living model of the family: people, income, loans, assets, and the policies they already hold. From that it works out what protection the household needs and what it can afford, and it re-plans whenever life changes. Insurance purchase is the moment it earns money. The ongoing relationship (memory, life events, renewals) is why people come back.

Three problems from Kshitij's framing:
1. **Wrong picture of safety.** People rely on corporate cover that ends with the job, mistake endowment plans for term cover, and leave parents, devices and travel uncovered.
2. **No affordability view.** Advice ignores existing EMIs and real cash flow, so it's either ignored or over-sold.
3. **Payment chaos.** Monthly, quarterly, half-yearly and annual premiums from different insurers cause spike months and lapsed policies, which throw away the no-claim bonus and restart waiting periods.

### Where I'd push back on the plan

| Your idea | My take | Why |
|---|---|---|
| Capture current expenses, like an expense manager | **Ask for 4 money facts, not expenses.** Take-home pay, total monthly EMIs, rough fixed household spend, and emergency savings. | Full expense tracking is a different product with heavy churn, and it breaks the "few questions" promise. These 4 numbers are all the affordability maths needs. Account aggregator data later fills the detail automatically. |
| Capture gold | **Optional, and treated as liquidity, not something to insure.** | Gold rarely changes the insurance plan. It does count toward the emergency buffer, which affects how large a health deductible or top-up the family can carry. Asking about it up front costs a question for little gain. |
| Family tree | **Yes, and it's the core of the product.** Keep it to the people the money depends on: spouse, children, parents, and anyone else financially dependent. | Every recommendation is keyed to a person. This is also the data asset that makes Kavach worth more over time. |
| Life-events section | **Yes. Make it the hero of the demo, not a side tab.** | "I'm buying a car" → the plan changes on screen, with a before-and-after diff. This shows memory and reasoning together, which is where 65% of the marks are. |
| Mock marketplace | **Yes, but clearly labelled illustrative.** The purchase step ends in a "continue with partner" handoff. | Selling real products for commission needs an IRDAI licence. Judges and future investors will both notice whether we got this right. |
| Account aggregators and real insurers later | **Yes, and design for it now.** Every fact stores where it came from (said, document, inferred, or AA), so a real data feed slots in later without reworking the model. | This is the step from hackathon to company, so the data model shouldn't block it. |

---

## 3. Product: four screens and one loop

1. **Set up the household (about 2 minutes).** A conversation, not a form. The user describes the family in a sentence or two. Gemini builds a draft **family tree card** that they tap to correct. Then come the 4 money facts as sliders or chips, and optional uploads: policy PDFs, RC book, phone invoice.
2. **Safety map.** A grid of each family member against each risk (income on death, hospitalisation, critical illness, vehicle, device, travel), in green, amber or red. Each cell shows what they have, what they need and the ₹ gap. A single **household safety score** sits on top.
3. **The plan.** The best mix of covers that **fits a premium budget**. The budget comes from the 4 money facts. The engine trades off gaps by ₹ exposure: if the budget can't cover everything, it covers the costliest risks first and says what's deferred and why. Each plan item can open the **marketplace** (mocked): 3 illustrative quotes per cover type, with features compared side by side.
4. **Premium calendar.** 12 months of existing and planned premiums by payment mode. It flags spike months, sets one flat monthly amount to set aside, shows what each payment mode costs, and exports reminders to Google Calendar.

**The loop: life events.** One input box: "What's changed, or what are you planning?" Examples are "buying a ₹14L car in March", "second baby due", "switching jobs", "parents moving in", "trip to Dubai in December". Kavach updates the household model, re-runs the plan, and shows a **diff**: which covers were added, removed or resized, how the budget changed, and how the calendar moved. Each event is saved, so the household has a timeline.

**Memory in practice.** When the user returns: "Last time you said you're buying a car in March. Did that happen?" Renewals nudge 30 days ahead. Planned events become reminders.

---

## 4. Asking as little as possible

The rule stays the same: **ask only when the answer changes the plan by real money.**

- Gemini extracts everything it can from the sentence and documents into the household model, marking each fact with a **source** and a **confidence** level.
- A question planner scores each unknown by *(₹ impact on the plan) × (uncertainty)* and asks the top 2 or 3 only, as tap-to-answer chips.
- Everything else is inferred and shown as **"we assumed X, tap to change"**. That keeps the flow short and stays honest.

A typical session asks 6 to 8 things in total: the family sentence, the 4 money facts, and 1 to 3 smart questions.

---

## 5. Data model

This is the part that should outlive the hackathon.

```
Household
 ├─ members[]        id, relation, age, dependent?, health flags (optional)
 ├─ finances         take_home_monthly, emi_monthly, fixed_spend_monthly, emergency_fund, gold_value?
 ├─ liabilities[]    type (home/car/personal), outstanding, emi, end_date
 ├─ assets[]         type (vehicle/device/home/gold), value, purchase_date, linked_member
 ├─ policies[]       insurer, type, members_covered, sum_insured, premium, mode, next_due, ncb, source_doc
 ├─ events[]         append-only life-event log: {when, text, parsed_change, plan_version_before/after}
 └─ plans[]          versioned outputs: needs, recommended covers, budget, calendar, safety score
Every fact: { value, source: said | document | inferred | aa | insurer_api, confidence, updated_at }
```

- **Event-sourced.** The current household state is the result of applying every event in order. That's what makes the before-and-after diffs, the timeline and "remembering" cheap to build.
- **Plans are versioned**, so every recommendation can be explained and audited later. Regulators and partners will want that.
- **Connectors later:** account aggregators (via a licensed partner), insurance repository and e-insurance account pulls, Bima Sugam, and insurer APIs. Each one is just another writer that adds facts with its own `source`.

---

## 6. Architecture (Gen AI is 40% of the score)

The LLM handles understanding and reasoning. All ₹ figures come from a **deterministic engine** with unit tests.

```
Next.js app (Firebase App Hosting) ── Firebase Auth ── Firestore (household, events, plans)
        │
        ▼
Agent service: Google ADK on Cloud Run
   ├── Intake agent ........ sentence/voice → household model draft (Gemini structured output)
   ├── Document agent ...... policy PDFs/invoices/RC → policies[], assets[] (Gemini multimodal)
   ├── Question planner .... picks 2–3 highest-value questions
   ├── Life-event agent .... free-text event → typed change set applied to the household
   ├── Engine tools (deterministic):
   │     needs()       term ≈ 10–15× income + liabilities; health by city tier and family; parents separate; device/travel/vehicle triggers
   │     budget()      premium budget from the 4 money facts
   │     optimise()    choose the mix of covers that closes the most ₹ gap within budget
   │     calendar()    expand premiums by mode → 12-month schedule, spikes, monthly set-aside
   │     diff()        compare plan versions
   ├── Advisor agent ....... explains plan and diffs in plain English (Hindi a stretch), grounded with Google Search
   └── Marketplace (mock) .. static catalogue of ~15 illustrative products, matched to plan items
```

Stack is unchanged from the first version: latest Gemini 3.x through the `google-genai` SDK on Vertex AI, ADK in Python with FastAPI on Cloud Run, Next.js with TypeScript, Tailwind and shadcn/ui on Firebase App Hosting, plus Firestore, Cloud Storage and Firebase Auth. The repo is a monorepo: `apps/web`, `services/agent`, `packages/engine` (with tests), `data/catalog`, `infra/` and `docs/`. A single-app version on Cloud Run remains the fallback if the deadline forces it.

---

## 7. Demo story (3-minute video)

**Rahul, 34, Bengaluru.** Wife, daughter aged 5, parents aged 62 and 58. Creta on a loan, a ₹1.8L iPhone, ₹5L corporate health cover, one LIC endowment policy.

| Time | Beat |
|---|---|
| 0:00–0:20 | The hook: "Rahul thinks he's covered." |
| 0:20–0:55 | He describes his family in a sentence, which becomes a family tree card he taps to confirm. He sets 4 money sliders and drops 2 PDFs. Two chip questions follow. |
| 0:55–1:30 | **Safety map, mostly red.** Parents uncovered, the LIC plan is an endowment rather than term cover, health is corporate-only, the phone is uninsured. Safety score 38/100. |
| 1:30–1:55 | **Plan within budget.** "₹4,100 a month closes 92% of your ₹ gap." Rahul opens the mock marketplace and compares 3 term quotes. |
| 1:55–2:35 | **Life event:** he types "Switching to a startup next month, and we're going to Dubai in December." The plan re-runs and shows a diff: buy individual health cover now while still employed, add travel cover for December, and the calendar shifts. |
| 2:35–2:55 | Rahul comes back a week later and Kavach remembers. Then the architecture, the business model and the close. |

---

## 8. Business model

- **Revenue now:** a distribution share on policies sold through a licensed partner (a broker or web aggregator), starting from the mocked marketplace.
- **Revenue later:**
  - **B2B2C.** Employers offer Kavach as an employee benefit, including help moving people from group to individual cover when they change jobs.
  - **White label.** Banks and wealth apps embed the safety score and planner.
  - **Paid advisory** for complex households.
- **Regulation:** partner with an IRDAI-licensed intermediary first, then apply for our own licence. Collect explicit consent under the DPDP Act 2023. Account aggregator access goes through a licensed partner.
- **Why we win:** competitors sell one policy at a time, while Kavach owns the *household model and its timeline*. More events mean better advice, more renewals, and more products sold over time.
- Source India's protection-gap figures from IRDAI or Swiss Re before quoting numbers in the deck.

---

## 9. Build plan to Saturday 18 October

The scope grew, so the cut list is stricter.

| Day | Deliverable |
|---|---|
| **Tue 14 (today)** | Confirm the team is registered. GCP project and APIs. Public repo scaffold. Firestore schema. Rahul and 2 more personas, plus mock policy PDFs and the ~15-product mock catalogue |
| **Wed 15** | Engine (`needs`, `budget`, `optimise`, `calendar`, `diff`) with tests. Intake agent and document agent producing the household model |
| **Thu 16** | Question planner and life-event agent. Screens: household setup, safety map, plan. First deploy |
| **Fri 17** | Calendar screen, life-event diff screen, mock marketplace, returning-user memory. Run all personas end to end on the live URL |
| **Sat 18** | Video, deck PDF, README with architecture diagram. **Submit early.** |

**Must ship:** household setup with family tree, document reading, safety map, budget-fitted plan, life event with diff, calendar, live deployed link.
**Cut first:** voice and Hindi, then the marketplace comparison view (keep a simple quote list), then .ics export, then the returning-user nudge (show memory through the event timeline instead).
**After the hackathon:** account aggregator partner, real insurer quotes, renewal reminders over WhatsApp, and the employer pilot.

---

## 10. Decisions needed

1. Are you registered with a team of 2 to 4, all 21+ and no students? Team changes close today.
2. Are you OK with 4 money facts instead of full expense tracking, and with gold as optional?
3. Should I start the build now on this plan?
