# 10 · Build plan: workstreams, order, schedule and definition of done

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**How to turn this plan into a working, deployed Kavach by Sunday 18 October 2026 (confirm the exact cut-off time and time zone with the organisers), with several builders (people or agents) working in parallel without stepping on each other.** The detailed, current version is [implementation-plan.md](../implementation-plan.md): 14 work packages, layers, integration gates and the clock. This document keeps the ground rules, the workstream map and the definition of done in line with it.

---

## 1. Ground rules for builders

1. **Schemas first.** Nobody writes web or API code against a shape that isn't in `packages/schemas` (Zod v4, imported by web, API and engine). Changes during the build are additive (new fields, schemas, enum values); nothing is renamed or removed.
2. **Engine is pure.** No imports from `apps/` into `packages/engine`. Every worked example in [05](05-rules-engine.md) is in `examples.ts` and checked by `pnpm --filter @kavach/engine check` before the code that depends on it merges.
3. **Fixtures for LLM calls.** Every Gemini call goes through `generateStructured()` with a recorded fixture in `apps/api/fixtures/` (`FAKE_LLM=1`), so the UI and API run without live model calls or keys.
4. **The demo path is sacred.** Anything that touches setup → job change → hospital → claim for the Sharma persona must keep the demo path working with fixtures, run end to end before every merge.
5. **One feature, one branch, one worktree**; run it for real (API and web started, endpoints called, pages loaded) before merging to `main`; `PROGRESS.md` records dependencies and the re-test after a dependency lands.
6. **Every rupee number in UI copy comes from the engine.** A check fails on `₹` followed by digits in `apps/web/**/*.tsx` outside fixtures.
7. **No unit-test suite during the hackathon** (Kshitij's rule): checks are runs of the real thing, the engine's example script and the Playwright demo path.

## 2. Workstreams

| WS | Name | Owns (paths) | Depends on | Key outputs | Work packages |
|---|---|---|---|---|---|
| **A** | Foundations & schemas | repo scaffold, `packages/schemas`, `infra/`, CI, `apps/api` skeleton (auth, store, Gemini helper), `apps/web` shell | – | Monorepo builds; schemas v0; Firestore rules/indexes; deploy pipeline; empty app deployed | WP-0 |
| **B** | Rules engine | `packages/engine`, `data/rules/IN`, `data/catalog` | A (schemas) | hospital (all four billing branches), claim, say; then needs, budget, optimise, cover-map, score, calendar, diff, sensitivity (HX-1, CX-1, PX-1) | WP-1, WP-9 (engine part) |
| **C** | Document intelligence | `apps/api/src/agents/{doc-reader,…}`, ingest, retrieval | A | Upload → policies with citations; wording → clauses + vectors + terms; clause viewer API | WP-8 |
| **D** | Desk core & planning agents | `apps/api/src/core/answer.ts`, `agents/{estimate-reader,life-event,intake,question,action,advisor,verifier}`, routes | A, B, C (policies) | Estimate reader; `answer()`; text-and-photo desk; life change → plan diff → actions; verifier | WP-2, WP-3, WP-9 |
| **E** | Live hospital desk | `apps/api/src/live`, `agents/desk-live.ts`, web `lib/audio`, `lib/live` | A, B (hospital), D (`answer()`) | WebSocket bridge to Gemini Live via `@google/genai` (audio only), estimate capture, cards, fallback text mode | WP-6 |
| **F** | Claims | `agents/{claim-reader,appeal-drafter}`, letter templates, PDF render | B (claim), C, D (verifier) | Claim case, deductions, appeal letter PDF | WP-10 |
| **G** | Web UI | `apps/web` screens S01–S32, design system tokens/components, card PNG route | A; then each backend WS via fixtures | All screens per [08](08-screens.md), i18n EN/HI, accessibility | WP-4, WP-12 |
| **H** | Evals & proof | `evals/`, `data/wordings`, labels, Proof page data | C | 8 labelled wordings (more if time); eval harness; results JSON; S26 data | WP-11 |
| **I** | Demo content & story | `data/personas`, `data/samples`, demo controls, video, deck | B, all for the end | Sample docs, persona, recorded video, deck PDF | WP-7, WP-14 |
| **J** | Rule verification (human) | `sources` + `status` in `packages/engine/src/rules.ts` | – | Primary sources (2024 master circular paragraph numbers) for every VERIFY rule | (human, §7 of implementation-plan) |
| **K** | WhatsApp door | `apps/api/src/channels/whatsapp`, `apps/web/src/app/api/og/card` | D (`answer()`) | Webhook (Meta + Twilio), voice notes in/out, card images, household alert, dated nudge, claim forwarding | WP-5 |

WS J and the labelling half of WS H need human judgement (reading regulations and policies carefully). Agents can draft; a person signs off. Plan-doc updates are WP-13.

## 3. Dependency graph

```
A ──┬──► B ──┬──► D (answer()) ──┬──► E (live desk)
    │        │                   ├──► K (WhatsApp)
    │        │                   └──► F (claims) ◄── C
    ├──► C ──┴──────────────────────────┘
    ├──► G (on fixtures from the first hour; swaps to live APIs as they land)
    └──► H (needs C's pipeline for the harness; labelling starts immediately)
J (independent, feeds B's rule statuses) ─► B
I (samples first; persona after B; video/deck last)
```

## 4. Schedule: layers and integration gates

The Wed–Sun table that used to be here is replaced by the layered plan in [implementation-plan.md](../implementation-plan.md) §5, which builds the full scope as layers on a working spine and passes an integration gate on the deployed URL and a real Android phone before the next layer starts. **T** is the submission cut-off (assumed Sun 18 Oct 18:00 IST until confirmed).

| Layer | What is live after it | Gate |
|---|---|---|
| **Hour one** (Fri ~19:30–21:00) | Nothing user-facing: first-hour checks (cut-off time, model IDs and region, live spike on Node, Hindi voice audition, Meta + Twilio to one webhook and templates submitted, circular paragraph numbers), scaffold, engine examples | – |
| **Layer 0: the spine** (Fri night) | "Try the hospital scene" → sample estimate photo → engine → Hindi answer and cards, by text in the app **and** on WhatsApp (photo + text), deployed | **G0, Sat 02:00 IST**: HX-1 numbers exact on all 5 photos |
| **Layer 1: the hero** (Sat early morning) | Live Hindi voice desk on a phone (audio only); WhatsApp voice notes both ways; Rahul's alert; Why panel with the billing branch | **G1, Sat 10:00 IST**: hero scene end to end, 3 clean runs in a row; hero rules verified |
| **Layer 2: the other moments** (Sat day) | Job change with diff, letter and WhatsApp nudge; claim appeal with PDF and WhatsApp forwarding; citations on all hero and claim terms | **G2, Sat 18:00 IST**: full demo path on the live URL. Nothing new is added after G2 |
| **Layer 3: breadth and proof** (Sat night) | Proof page on 8 wordings; onboarding and remaining screens; desktop layout; plan docs updated | **Freeze, T−8 h (Sun 10:00 IST)**: only bug fixes after this |
| **Ship** (Sun) | Video, deck, README, submission | Submit by **T−3 h (Sun 15:00 IST)** |

If a gate fails, every builder stops new work and fixes the failing path first. The human-only jobs (rules sign-off, voice audition, printing and photographing the estimate, gates, labelling, filming, deck, phone and sandbox tests; about 24 hours across two people) are on the critical path and booked at fixed times (implementation-plan.md §7).

## 5. Definition of done (per feature)

- Code merged to `main` after running the feature end to end in its worktree; `pnpm format`, `pnpm lint`, `pnpm typecheck` and `pnpm build` pass; the demo path still works.
- Works on the deployed URL on a real Android phone and on desktop Chrome.
- English and Hindi strings present (`apps/web/messages/{en,hi}/<feature>.json`); Hindi always on desk and WhatsApp.
- Every number on screen traceable (Why panel shows rule IDs and sources).
- Every policy statement has a citation; desk cards carry the engine-trace ✓; free text (explanations, appeal letter) passes the verifier.
- Gemini calls have fixtures, so the feature runs with `FAKE_LLM=1`, `STORE=memory`, `AUTH_DISABLED=1` and no keys (Meta, Twilio and Google keys are placeholders in `.env` until provided).
- Empty, loading and error states implemented.
- Accessibility: keyboard + screen reader labels + contrast check passed.

## 6. How we check

No unit-test suite during the hackathon; every level is checked by running the real thing.

| Level | What | How |
|---|---|---|
| Engine | HX-1 (all four billing branches), ICU never deducted, CX-1, PX-1 | `pnpm --filter @kavach/engine check` (fails on any number that differs) |
| Agents | The 5 video agents on the sample documents and 5 estimate photos; adversarial inputs (blurry, wrong document, off-topic, prompt injection in a document) | Run against the real model once; record fixtures; replay with `FAKE_LLM=1` |
| API | Desk, demo, claims, WhatsApp signature check, rate limits, authz (non-member can't read) | Start the API and call it with curl; `PORT=<port> pnpm --filter @kavach/api dev` |
| Web | Screens load in EN and HI; no ₹ literals | Start the web app and load each page; the ₹-literal check |
| E2E | Demo path: landing → demo → job change → desk (text mode with fixtures) → claim | Playwright against the live URL at each gate |
| Live | 10-scenario spoken rehearsal on a real phone; spoken amounts vs cards | Manual checklist (03 §11) + offline transcript check |
| WhatsApp | Fresh number joins the sandbox → photo + voice note → reply + Rahul's alert | Manual, at G0/G1 and on Sunday |
| Eval | Policy-reading accuracy on 8 wordings | `evals/run-eval.ts` |

## 7. Cut list (in order, only if the deadline forces it)

Kshitij's direction is full scope, ordered as layers; cut only from the end of Layer 3:
1. Dark theme.
2. Desktop-specific layouts (mobile layout centred on desktop).
3. Clause highlight boxes on page images (keep quote + page number).
4. S12/S13 sheets.
5. Family invites (Kamala uses the demo link).
6. Premium strip/calendar detail (keep the set-aside number only).
7. Onboarding screens other than S04/S05/S07.

**Never cut:** the hero with the correct number (₹90,000, with the ₹16,000 branch), the WhatsApp fallback, citations + verifier, engine-computed numbers, the Proof page, demo mode.

## 8. Risks during the build

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live API behaviour (latency, Hindi quality, VAD in noise) | Medium | Hour-one spike on Node (WS E); voice audition; audio only (no 2-minute audio+video cap); text+photo and WhatsApp fallbacks; record in a quiet room. If the Node spike fails, only the live bridge moves to a small Python ADK service |
| Model availability in chosen region | Medium | Check on day 1; use nearest region / global endpoint; document it |
| Estimate photo misread | Medium | High-res still + Pro; user confirms parsed lines; manual 3-number fallback |
| Policy wording ingest slow/costly | Low–Medium | Parse once per product; parallel page batches; Flash for segmentation |
| Wrong regulatory rule | Medium | WS J verification; hero rules verified before G1; VERIFY flags visible; uncertain branches said out loud (₹16,000 branch) |
| WhatsApp limits (Meta test number: 5 recipients; 24-hour window; sandbox 3-day membership) | High | Meta for the video, Twilio sandbox QR for judges; utility templates for the alert and nudge; in-app alert as the fallback; honest README |
| Meta policy on AI chatbots | Low | Insurance-only scope; off-topic declined |
| Scope sprawl across 11 workstreams | High | Schemas first; layers and gates; nothing new after G2; cut list |
| Firestore vector index build time | Low | Create index in hour one |
| Judge opens link during a cold start | Low | Min instances 1 for API and web |

## 9. Post-hackathon (not in this build)

See [12-roadmap.md](12-roadmap.md).
