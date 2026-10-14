# 10 · Build plan: workstreams, order, schedule and definition of done

**How to turn this plan into a working, deployed Kavach by Saturday 18 October 2026, with several builders (people or agents) working in parallel without stepping on each other.** This is a plan only; no build starts until Kshitij says go.

---

## 1. Ground rules for builders

1. **Contracts first.** Nobody writes web or API code against a shape that isn't in `packages/contracts`. Workstream A publishes v0 contracts in the first half-day; changes after that go through a PR that touches contracts + both sides.
2. **Engine is pure.** No imports from `services/` into `packages/engine`. Every worked example in [05](05-rules-engine.md) is a test before the code that satisfies it.
3. **Fixtures for LLM calls.** Every agent has recorded fixtures (`FAKE_LLM=1`) so the UI can be built and tested without live model calls.
4. **The demo path is sacred.** Anything that touches setup → job change → hospital → claim for the Sharma persona must keep the Playwright demo test green.
5. **Small PRs to `main`**, CI green before merge, deploy on merge.
6. **Every rupee number in UI copy comes from the engine.** Grep check in CI: no `₹` followed by digits in `apps/web/**/*.tsx` outside tests and fixtures.

## 2. Workstreams

| WS | Name | Owns (paths) | Depends on | Key outputs |
|---|---|---|---|---|
| **A** | Foundations & contracts | repo scaffold, `packages/contracts`, `infra/`, CI, `services/api` skeleton (auth, event store, projector), `apps/web` shell | – | Monorepo builds; contracts v0; Firestore rules/indexes; deploy pipeline; empty app deployed on day 1 |
| **B** | Rules engine | `packages/engine`, `data/rules/IN`, `data/catalog` | A (contracts) | needs, budget, optimise, cover_map, score, calendar, diff, hospital, claim, sensitivity — all with tests (HX-1, CX-1, PX-1) |
| **C** | Document intelligence | `services/api/app/ingest`, `retrieval`, `agents/{doc_classifier,schedule_extractor,wording_segmenter,terms_extractor}` | A | Upload → policies with citations; wording → clauses + vectors + terms; clause viewer API |
| **D** | Planning agents & commands | `agents/{intake,question,life_event,action,advisor,verifier}`, `commands/` | A, B, C (policies) | Setup flow, questions, life change → plan diff → actions; verifier library |
| **E** | Live hospital desk | `app/live`, `agents/desk`, `agents/estimate_reader`, web `lib/audio`, `lib/live` | A, B (hospital), D (verifier) | WebSocket bridge, ADK live run, estimate capture, cards, fallback text mode |
| **F** | Claims | `agents/{claim_letter_reader,claim,appeal_drafter}`, letter templates, PDF render | B (claim), C, D (verifier) | Claim case, deductions, appeal letter PDF |
| **G** | Web UI | `apps/web` screens S01–S32, design system tokens/components | A; then each backend WS via fixtures | All screens per [08](08-screens.md), i18n EN/HI, accessibility |
| **H** | Evals & proof | `evals/`, `data/wordings`, labels, Proof page data | C | 20–25 labelled wordings; eval harness; results JSON; S26 data |
| **I** | Demo content & story | `data/personas`, `data/samples`, demo controls, video, deck | B, all for the end | Sample docs, persona event scripts, recorded video, deck PDF |
| **J** | Rule verification (human) | `data/rules/IN/*.yaml` `sources` + `status` | – | Primary sources for every VERIFY rule (game-plan §6) |

WS J and the labelling half of WS H need human judgement (reading regulations and policies carefully). Agents can draft; a person signs off.

## 3. Dependency graph

```
A ──┬──► B ──┬──► D ──┬──► E
    │        │        ├──► F
    ├──► C ──┴────────┘
    ├──► G (on fixtures from day 1; swaps to live APIs as they land)
    └──► H (needs C's pipeline for the harness; labelling starts immediately)
J (independent, feeds B's rules pack) ─► B
I (samples on day 1; personas after B; video/deck last)
```

## 4. Schedule (Tue 14 → Sat 18 Oct 2026)

| When | A | B | C | D | E | F | G | H | I/J |
|---|---|---|---|---|---|---|---|---|---|
| **Tue 14 evening** | Scaffold, contracts v0, GCP project + APIs, CI | Rules pack YAML skeleton, test cases written for HX-1/CX-1/PX-1 | Pick ingest libs; prompts drafted | Prompts drafted | Spike: ADK `run_live` echo through Cloud Run WebSocket | – | Tokens, shell, S01, S04–S06 on fixtures | Choose 24 wordings; manifest | Sample docs drafted; start rule verification |
| **Wed 15** | Event store, projector, auth, Firestore rules; first deploy | needs, budget, optimise, cover_map, score passing | Schedule extraction live; wording segmentation + embeddings | Intake + question planner + setup commands | Live audio both ways on a phone; barge-in | Letter reader prompt + fixture | S07–S11, S14–S16 | Label 8 wordings | Persona event script v1 |
| **Thu 16** | Hardening, rate limits, logging | calendar, diff, hospital (HX-1 green), claim (CX-1 green), sensitivity | Terms extraction + verifier on terms | Life change → plan diff → actions; advisor | Estimate capture → engine → cards; verified cards; Hindi voice tuned | Claim assess + appeal draft + PDF | S17–S24 | Harness runs on 8; label 8 more | Demo controls; samples printed + photographed |
| **Fri 17** | Prod deploy, min instances, budget alert | Property tests, edge cases | Perf (ingest ≤ 90 s) | Polish copy, Hindi strings | Fallback text mode; resilience; 10-scenario rehearsal | S30–S32 wired | S25–S29, accessibility pass, desktop layouts | Full run on 24; Proof page live | Full end-to-end runs on live URL; record video takes |
| **Sat 18** | Freeze by noon IST | – | – | – | Final rehearsal | – | Bug fixes only | Final numbers | Edit video, deck PDF, README; **submit early (by afternoon IST)** |

## 5. Definition of done (per feature)

- Code merged to `main`, CI green (lint, types, unit, Playwright demo path).
- Works on the deployed URL on a real Android phone and on desktop Chrome.
- English and Hindi strings present.
- Every number on screen traceable (Why panel shows rule IDs and sources).
- Every policy statement has a citation and a verification badge.
- Empty, loading and error states implemented.
- Accessibility: keyboard + screen reader labels + contrast check passed.

## 6. Test plan

| Level | What | Tool |
|---|---|---|
| Unit | Engine rules and worked examples; projector `apply` per event; contracts round-trip | pytest, hypothesis |
| Agent | Golden outputs on fixtures; adversarial docs | pytest with `FAKE_LLM` + a nightly live run |
| API | Commands write the right events; authz (member can't delete; non-member can't read) | pytest + Firebase emulators |
| Rules | Firestore/Storage rules tests | `@firebase/rules-unit-testing` |
| Web | Components, i18n keys present | Vitest + Testing Library |
| E2E | Demo path: landing → demo → job change → desk (text mode with fixture) → claim | Playwright against emulators + staging |
| Live | 10-scenario spoken rehearsal on a real phone | manual checklist (03 §11) |
| Eval | Policy-reading accuracy | `evals/run_eval.py` |

## 7. Cut list (in order, only if the deadline forces it)

Kshitij's direction is ambition first; cut only what doesn't touch the three moments:
1. Premium strip/calendar detail (keep the set-aside number only).
2. Family invites (Kamala uses the same demo household on her own phone via the demo link).
3. Escalation ladder tracking in claims (keep the appeal letter).
4. Desktop-specific layouts (mobile layout centred on desktop).
5. Dark theme.
6. Clause highlight boxes on page images (keep quote + page number).
**Never cut:** the hospital live desk in Hindi, citations + verifier, the engine-computed numbers, the Proof page, the deployed demo mode.

## 8. Risks during the build

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live API behaviour (latency, Hindi quality, VAD in noise) | Medium | Day-1 spike (WS E); voice audition; text+photo fallback; record in a quiet room |
| Model availability in chosen region | Medium | Check on day 1; use nearest region / global endpoint; document it |
| Estimate photo misread | Medium | High-res still + Pro; user confirms parsed lines; manual 3-number fallback |
| Policy wording ingest slow/costly | Low–Medium | Parse once per product; parallel page batches; Flash for segmentation |
| Wrong regulatory rule | Medium | WS J verification; VERIFY flags visible; conservative wording |
| Scope sprawl across 10 workstreams | High | Contracts-first; demo path test; cut list |
| Firestore vector index build time | Low | Create index on day 1 |
| Judge opens link during a cold start | Low | Min instances 1 for API and web |

## 9. Post-hackathon (not in this build)

See [12-roadmap.md](12-roadmap.md).
