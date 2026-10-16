# Kavach: complete project plan

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**Kavach is the AI that stands beside your family at every insurance moment.** It remembers the household and acts at three moments where Indian families lose money: when life changes, at the hospital desk (the hero, live by voice in Hindi, reading the estimate from a photo), and when a claim goes wrong. The same agent is also reachable on **WhatsApp**, a second door for the same three moments.

This folder is the complete build plan for the Google Cloud AI Builder Cup 2026 (BFSI track, prototype due **Sun 18 Oct 2026**). It is written so that someone who has never seen the project can read it and build Kavach on their own. Written 14 Oct 2026 from the adopted [game plan](../research/game-plan.md) and the research in [brief.md](../research/brief.md), [feasibility.md](../research/feasibility.md), [market-scan.md](../research/market-scan.md) and [past-winners.md](../research/past-winners.md).

> **Status:** the build has started. [implementation-plan.md](../implementation-plan.md) (work packages, layers, gates, stack) and [red-team-response.md](../research/red-team-response.md) (rebuilt hero numbers, WhatsApp door) override these documents wherever they differ; these documents have been brought into line with both.

---

## How to read this

| If you are… | Read |
|---|---|
| New to the project | This page → [01 Product](01-product.md) → [09 Demo script](09-demo-data-and-script.md) |
| Building the backend | [02 Architecture](02-architecture.md) → [04 Data model](04-data-model.md) → [05 Rules engine](05-rules-engine.md) → [06 API](06-api.md) |
| Building the AI | [03 Gemini and agents](03-gemini-and-agents.md) → [05 Rules engine](05-rules-engine.md) |
| Building the front end | [07 Design system](07-design-system.md) → [08 Screens](08-screens.md) → [06 API](06-api.md) |
| Planning the work | [10 Build plan](10-build-plan.md) |
| Checking risk and regulation | [11 Trust, safety, compliance](11-trust-safety-compliance.md) |
| Thinking about the business | [01 Product](01-product.md) §8, [12 Roadmap](12-roadmap.md) |

## Documents

| # | Document | What's inside |
|---|---|---|
| 01 | [Product specification](01-product.md) | Pitch, personas, principles, the household memory and three moments, 55+ numbered requirements (FR/NFR), metrics, scope, glossary of Indian insurance terms |
| 02 | [System architecture](02-architecture.md) | Google Cloud diagram, architecture decisions, components (one Fastify API, one Next.js app, WhatsApp webhook), request flows for each moment and each door, security, environments, tech stack with versions, full repo structure |
| 03 | [Gemini, agents, grounding, verification, evaluation](03-gemini-and-agents.md) | Model per feature (Pro/Flash/Live/TTS/embeddings), 15 agents (5 carry the video) with prompts and schemas, clause retrieval, the verifier, the audio-only Gemini Live hospital agent in detail, WhatsApp voice notes, guardrails, the accuracy evaluation |
| 04 | [Data model and database](04-data-model.md) | Firestore collections and fields (plain documents), timeline entries, fact provenance, WhatsApp channel and consent, indexes (incl. vector), security rules, Sharma sample data |
| 05 | [Rules engine](05-rules-engine.md) | Every formula and rule ID, rules-pack format, worked examples HX-1 (hospital, ₹90,000 saved with the room-category tariff; ₹16,000 if the hospital doesn't bill by room), CX-1 (claim, ₹14,560 recoverable), PX-1 (plans before/after job change) |
| 06 | [API specification](06-api.md) | REST endpoints, documents written by each command, the live WebSocket protocol, the WhatsApp webhook, key response types |
| 07 | [Design system](07-design-system.md) | Brand, colour palette with contrast ratios (light, dark, desk theme), typography for English and Hindi, components, motion, icons, voice and tone, accessibility, tokens CSS |
| 08 | [Screens](08-screens.md) | Sitemap and 30+ screens with mobile wireframes, copy, states and acceptance criteria; WhatsApp message designs; screen ↔ requirement ↔ endpoint map |
| 09 | [Demo data, video script, deck, submission](09-demo-data-and-script.md) | Personas, sample documents, demo checkpoints, 3-minute shot list, 12-slide deck outline, submission checklist |
| 10 | [Build plan](10-build-plan.md) | Workstreams, dependency graph, layers and integration gates to Sun 18 (schedule now in [implementation-plan.md](../implementation-plan.md)), definition of done, checks, cut list, risks |
| 11 | [Trust, safety, compliance](11-trust-safety-compliance.md) | IRDAI boundaries, DPDP Act design (incl. WhatsApp consent and media retention), hospital AI safety, disclaimers, rule-verification table |
| 12 | [Roadmap](12-roadmap.md) | Validation, Singapore pack, licensed partner, employers, AA and Bima Sugam |

## Decisions this plan is built on

| Decision | Source |
|---|---|
| Kavach = household memory + three acting moments; hospital desk is the hero | Kshitij, 14 Oct (game-plan.md) |
| Aim for a 10/10 entry; don't let build time limit ambition | Kshitij, 14 Oct |
| No user interviews or letters of interest for the hackathon | Kshitij, 14 Oct |
| Must use Gemini/Google agent tools, deployed on Cloud Run or Firebase; submit live link, < 3 min video, public repo, PDF deck | Hackathon rules |
| Judging: Gen AI 40%, impact 25%, innovation 25%, UX 10% | Hackathon rules |
| Latest libraries, industry-standard structure; keep the path to account aggregators and real insurers | Kshitij, 14 Oct |
| **Defaulted:** the hospital hero is Rahul's mother, Kamala, using Kavach alone in Hindi | Open question in game-plan.md; default chosen here, can be changed |
| **Defaulted:** the claim-appeal moment is one quick frame (~15 s) in the video, full in the app and deck | Open question in game-plan.md; default chosen here, can be changed |
| 4 money facts instead of expense tracking; gold optional | brief.md v2 |
| Hero number is **₹90,000** (₹1,50,800 in the ₹9,000 room vs ₹60,800 in the ₹5,000 room) using the hospital's room-category tariff; ₹16,000 if the hospital doesn't bill by room; package rates are asked at the desk | red-team-response.md §3 |
| WhatsApp is a second door to the same agent (desk fallback, Rahul's household alert, job-change nudge, claim letter forwarding), not a second product | Kshitij + red-team-response.md §2 |
| Live session is audio-only; the estimate photo goes through the estimate reader | red-team-response.md §3 |
| API in **TypeScript + Fastify 5**, shared **Zod** schemas in `packages/schemas`, engine is the TypeScript package `@kavach/engine`; plain Firestore documents, no event sourcing | Kshitij, 16 Oct; implementation-plan.md §2, §3.4 |
| Full scope, built as layers on a working spine with integration gates | red-team-response.md §4; implementation-plan.md §5 |

## The system in one picture

```
 Family (Rahul, Kamala…) ──► Next.js PWA on Firebase App Hosting      WhatsApp (Meta test number,
                                │ REST + WebSocket (live voice)         Twilio sandbox) ──┐ webhook
                                ▼                                                         │
                        Cloud Run: Fastify 5 (TypeScript) + @google/genai ◄───────────────┘
                        one answer() core for every door
             ┌──────────────────┼─────────────────────────┐
             ▼                  ▼                         ▼
   Gemini on Vertex AI   @kavach/engine (pure TS,  Firestore (plain household
   Pro · Flash · Live    tested rules → every ₹)   documents, clauses + vectors)
   · TTS · embeddings                               + Cloud Storage (documents)
```

## How the plan maps to the judging

| Criterion | Where the plan earns it |
|---|---|
| **Gen AI & technical merit (40%)** | Multimodal reading of real policy wordings with clause citations (03 §5); 15 agents with structured outputs; Gemini Live voice in Hindi with tool calls, fed by the estimate reader's reading of the room-category tariff (03 §7); Hindi voice notes in and out on WhatsApp; verifier (03 §6); measured accuracy on 8 labelled real wordings (03 §9); deterministic engine (05) |
| **Problem & impact (25%)** | Sourced problem (01 §2); rupee outcome per family (₹90,000 at the desk, ₹14,560 appeal); accessibility for older Hindi speakers, who can use the app or the WhatsApp they already use |
| **Innovation (25%)** | An agent at the hospital desk that decides which rule applies from what it reads (the billing branch); time-aware cover map; acting with approval rather than chatting; dated WhatsApp nudges |
| **UX (10%)** | Design system and desk mode (07); 30+ screens planned (08) |

## Open items to settle before or during the build

1. Confirm the exact submission cut-off time and time zone on the hack2skill dashboard (implementation-plan.md §5 assumes Sun 18:00 IST).
2. Pin exact Gemini model IDs (Pro, Flash, Live native-audio, TTS, embeddings) and region in the first hour (03 §2, implementation-plan.md §6).
3. Copy the 2024 master circular paragraph numbers and verify every rule still marked `to_verify` (11 §5); none of the hero's rules may stay unverified.
4. Meta test number and Twilio sandbox both reach the one webhook; submit the `household_alert` and `dated_reminder` utility templates to Meta.
5. Confirm with organisers: eligibility, India in JAPAC, and the BFSI category on the submission form (brief.md).
