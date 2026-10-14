# Kavach: complete project plan

**Kavach is the AI that stands beside your family at every insurance moment.** It remembers the household and acts at three moments where Indian families lose money: when life changes, at the hospital desk (the hero, live by voice and camera in Hindi), and when a claim goes wrong.

This folder is the complete build plan for the Google Cloud AI Builder Cup 2026 (BFSI track, prototype due **Sat 18 Oct 2026**). It is written so that someone who has never seen the project can read it and build Kavach on their own. Written 14 Oct 2026 from the adopted [game plan](../research/game-plan.md) and the research in [brief.md](../research/brief.md), [feasibility.md](../research/feasibility.md), [market-scan.md](../research/market-scan.md) and [past-winners.md](../research/past-winners.md).

> **Status:** plan only. No code has been written. Implementation starts when Kshitij says go.

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
| 02 | [System architecture](02-architecture.md) | Google Cloud diagram, 9 architecture decisions, components, request flows for each moment, security, environments, tech stack with versions, full repo structure |
| 03 | [Gemini, agents, grounding, verification, evaluation](03-gemini-and-agents.md) | Model per feature (Pro/Flash/Live/embeddings), 15 agents with prompts and schemas, clause retrieval, the verifier, the Gemini Live hospital agent in detail, guardrails, the accuracy evaluation |
| 04 | [Data model and database](04-data-model.md) | Firestore collections and fields, event catalogue, fact provenance, projection, indexes (incl. vector), security rules, Sharma sample data |
| 05 | [Rules engine](05-rules-engine.md) | Every formula and rule ID, rules-pack format, worked examples HX-1 (hospital, ₹80,000 saved), CX-1 (claim, ₹14,560 recoverable), PX-1 (plans before/after job change) |
| 06 | [API specification](06-api.md) | REST endpoints, events written by each command, the live WebSocket protocol, key response types |
| 07 | [Design system](07-design-system.md) | Brand, colour palette with contrast ratios (light, dark, desk theme), typography for English and Hindi, components, motion, icons, voice and tone, accessibility, tokens CSS |
| 08 | [Screens](08-screens.md) | Sitemap and 30+ screens with mobile wireframes, copy, states and acceptance criteria; screen ↔ requirement ↔ endpoint map |
| 09 | [Demo data, video script, deck, submission](09-demo-data-and-script.md) | Personas, sample documents, demo checkpoints, 3-minute shot list, 12-slide deck outline, submission checklist |
| 10 | [Build plan](10-build-plan.md) | 10 parallel workstreams, dependency graph, day-by-day schedule to Sat 18, definition of done, tests, cut list, risks |
| 11 | [Trust, safety, compliance](11-trust-safety-compliance.md) | IRDAI boundaries, DPDP Act design, hospital AI safety, disclaimers, rule-verification table |
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

## The system in one picture

```
 Family (Rahul, Kamala…) ──► Next.js PWA on Firebase App Hosting
                                │ REST + WebSocket (live voice/camera)
                                ▼
                        Cloud Run: FastAPI + Google ADK agents
             ┌──────────────────┼─────────────────────────┐
             ▼                  ▼                         ▼
   Gemini on Vertex AI   kavach_engine (pure,      Firestore (event-sourced
   Pro · Flash · Live    tested rules → every ₹)   household, clauses + vectors)
   · embeddings                                     + Cloud Storage (documents)
```

## How the plan maps to the judging

| Criterion | Where the plan earns it |
|---|---|
| **Gen AI & technical merit (40%)** | Multimodal reading of real policy wordings with clause citations (03 §5); 15 agents with structured outputs; Gemini Live voice+vision in Hindi with tool calls (03 §7); verifier (03 §6); measured accuracy on 20+ real wordings (03 §9); deterministic engine (05) |
| **Problem & impact (25%)** | Sourced problem (01 §2); rupee outcome per family (₹80,000 at the desk, ₹14,560 appeal); accessibility for older Hindi speakers |
| **Innovation (25%)** | An agent at the hospital desk; time-aware cover map; acting with approval rather than chatting |
| **UX (10%)** | Design system and desk mode (07); 30+ screens planned (08) |

## Open items to settle before or during the build

1. Kshitij to say "go" to start the build (10 §4 schedule assumes a Tue evening start).
2. Pin exact Gemini model IDs and region on day 1 (03 §2, 02 §3.2).
3. Verify every rule flagged VERIFY (11 §5).
4. Confirm with organisers: India in JAPAC, and the BFSI category on the submission form (brief.md).
