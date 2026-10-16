# Kavach: implementation plan

**How we turn the plan docs into a deployed, judged Kavach by Sunday 18 October 2026, with two people and parallel Claude agents.** Written Fri 16 Oct 2026, ~19:15 IST. This replaces the Wed–Sun schedule in [plan/10-build-plan.md](plan/10-build-plan.md) §4 and builds on the fixes in [research/red-team-response.md](research/red-team-response.md).

> **Status:** plan only. No app code has been written. The build starts when Kshitij says go; every hour of delay comes out of Layer 3 (§5), never out of the hero.

---

## 0. Read this first

| Question | Answer |
|---|---|
| What are we building? | Kavach: household memory plus three moments where it acts. The **hero** is the live Hindi voice agent at the hospital desk. |
| What is the one thing that must work? | Kamala at the desk: estimate photo → Gemini reads the room-category tariff → engine computes → Kavach says, in Hindi, "ask for the ₹5,000 room: about ₹60,800 instead of ₹1,50,800". **₹90,000 saved.** |
| What overrides what? | This file and `research/red-team-response.md` override `plan/01–12` wherever they differ. The plan docs still show the old ₹80,000 hero and no WhatsApp; WP-13 (§4) updates them. |
| How is the work split? | 14 work packages (§4), each with an owner, paths it owns, inputs/outputs and a test that proves it. Claude agents take the packages that have a written contract; humans take the six jobs only humans can do (§7). |
| How do we avoid a broken demo? | Build in **layers** (§5). Each layer is deployed and tested on a phone at an **integration gate** before the next layer starts. At every hour there is a working demo. |
| What is the deadline? | Sun 18 Oct 2026. **Exact cut-off time is still unconfirmed** (Kshitij to read it from the hack2skill dashboard). Until confirmed this plan assumes **Sun 18:00 IST**, freezes at T−8 h and submits by T−3 h (§5). |

## 1. Decisions this plan is built on

| # | Decision | Source |
|---|---|---|
| D1 | Kavach = household memory + 3 acting moments; hospital desk is the hero | Kshitij, 14 Oct |
| D2 | **Hero persona: Rahul's mother Kamala, alone at the desk, in Hindi** (Suresh's planned angioplasty). Left to Claude "whatever is necessary"; this default is kept because it makes the strongest accessibility and Gen AI story | Kshitij, 16 Oct (game-plan question 1) |
| D3 | **Claim appeal is one quick frame (~15 s) in the video**; full flow in the app and deck (the recommended option) | Kshitij, 16 Oct (game-plan question 2) |
| D4 | Hero number is **₹90,000** (₹1,50,800 vs ₹60,800) using the hospital's room-category tariff; ₹16,000 branch if the hospital doesn't bill by room; package-rate branch asks the desk. CX-1 stays ₹14,560 | red-team-response §3 |
| D5 | R-HL-001 applies the ratio **only to heads priced by room category**; R-HL-002 now **protects ICU**; new R-HL-010 (billing type unknown → both branches + one question) and R-CLM-008 (deduction on ICU / non-differential hospital is challengeable) | red-team-response §3 |
| D6 | **WhatsApp is a second door to the same agent**, not a second product: fallback at the desk, Rahul's household alert, the job-change nudge, claim letter forwarding. Meta test number for the video, Twilio sandbox QR for judges | Kshitij + red-team-response §2 |
| D7 | Live session is **audio-only**; the estimate photo goes through the estimate reader and enters the session as a tool result (avoids the ~2 min audio+video cap; audio-only allows ~15 min) | red-team-response §3 |
| D8 | **Full scope, built as layers** with integration gates; defer only infrastructure judges never see (no event sourcing, no separate contracts package, one API service, one web app) | red-team-response §1, §4 |
| D9 | Latest stable libraries and an industry-standard monorepo | Kshitij, 14 Oct |
| D10 | Must use Gemini / Google agent tools, deployed on Cloud Run or Firebase. Submit live link, video < 3 min, public repo, PDF deck | Hackathon rules |

## 2. What changes from the plan docs (build simplifications)

These keep everything the judges see and remove work they never see.

| Area | Plan docs said | We build | Why |
|---|---|---|---|
| Household storage | Event-sourced `events` + `projection` | Plain Firestore documents: `households/{hid}` with members, policies, finances as fields; `plans`, `actions`, `deskSessions`, `claimCases` subcollections. A small `timeline` subcollection is written alongside for the Timeline screen | Event store + projector is ~a day of work with no visible gain; event sourcing moves to the roadmap slide |
| Shared types | `packages/contracts` (Pydantic → JSON Schema → TS) | Pydantic v2 models in `services/api/app/schemas/` and the engine's own models; FastAPI's OpenAPI → **`openapi-typescript`** generates `apps/web/lib/api/types.ts` in CI | Same guarantee (web and API never disagree), one generator, no extra package |
| Reads | Firestore listeners from the browser | API reads with TanStack Query; **one** Firestore listener for the desk session cards and Rahul's alert view | Fewer security rules to get right; listener only where "live" is visible |
| Worker | Separate `kavach-worker` + Cloud Tasks | FastAPI `BackgroundTasks` in the same service for ingest; wordings for the demo are **pre-ingested** by a script | Demo documents are known in advance |
| Live desk | Audio + camera frames to Gemini Live | Audio only to Gemini Live; camera shown on screen; "Capture" sends a still to the estimate reader (Pro), result injected as a tool result | Session cap and exact amounts |
| Verifier on live path | Transcript number matching per card | Cards carry engine `say` strings and an engine-trace ✓; the Pro verifier runs only on free text (explanations, appeal letter), off the live path | Latency |
| Agents | 15 | **5 carry the video** (estimate reader, desk live agent, life-change parser, claim letter reader + appeal drafter, document/schedule reader). The rest (intake, question planner, advisor, action drafter beyond the migration letter) are Layer 3 | Order, not cut |
| Screens | 30+ | The ~12 in the video + WhatsApp message designs first; the rest in Layer 3, English-only if needed (Hindi always on desk and WhatsApp) | Order, not cut |
| Proof page | 24 wordings | **8 labelled wordings**, said honestly as "8"; more if agents pre-fill labels and a human checks | Labelling is human time |
| ₹ literal guard | CI grep | One unit test that fails on `₹` followed by digits in `apps/web/**/*.tsx` outside fixtures | Same intent |

## 3. Stack and repository

### 3.1 Stack (verify and pin exact versions in WP-0 on day one; record them in the README)

| Area | Choice |
|---|---|
| Web | Next.js 16 (App Router), React 19.2, TypeScript 5.9+, Tailwind CSS v4, shadcn/ui, Motion, lucide-react, TanStack Query v5, react-hook-form + Zod v4, next-intl (`en`, `hi`), Firebase JS SDK v12 |
| Card images for WhatsApp | Next.js `ImageResponse` (`next/og`) route rendering the same card design to PNG, with Noto Sans Devanagari loaded for Hindi |
| API | Python 3.13, FastAPI, Uvicorn, Pydantic v2, firebase-admin, `google-genai` (Vertex AI), `google-adk` (live desk) |
| Engine | Pure Python package `kavach_engine`, Pydantic models, pytest + hypothesis, mypy strict |
| Audio | Browser `AudioWorklet` (16 kHz PCM capture, 24 kHz playback); server `ffmpeg` in the API image for WhatsApp OGG/Opus ↔ PCM |
| Letters | WeasyPrint (HTML template → PDF), Noto fonts |
| Tooling | pnpm workspaces + Turborepo (JS), uv workspace (Python), ruff, mypy, Vitest, Playwright, GitHub Actions |
| Google Cloud | Cloud Run (`kavach-api`), Firebase App Hosting (`apps/web`), Firestore (Native), Cloud Storage, Secret Manager, Artifact Registry, Cloud Build, Cloud Logging, budget alert |
| Models (env vars) | `KAVACH_MODEL_PRO`, `KAVACH_MODEL_FLASH`, `KAVACH_MODEL_LIVE` (native-audio), `KAVACH_MODEL_TTS` (Gemini TTS, for WhatsApp voice notes), `KAVACH_MODEL_EMBED`, `KAVACH_LIVE_VOICE`. Exact IDs chosen in the first-hour check (§6) |
| WhatsApp | Meta WhatsApp Cloud API (test number) and Twilio WhatsApp Sandbox, both hitting one webhook |

### 3.2 Repository layout

```
kavach/
├── README.md                  # pitch, live link, video, QR, architecture, how to run, model IDs, honest notes
├── docs/                      # plan/, research/, this file, ADRs
├── apps/web/                  # Next.js 16
│   ├── app/[locale]/(marketing)/{page.tsx, proof/}          # S01 landing, S26 proof
│   ├── app/[locale]/(app)/{home,setup,change,actions,desk,claims,policies,timeline,settings}/
│   ├── app/api/og/card/[cardId]/route.tsx                    # WhatsApp card PNG
│   ├── components/{ui,kavach}/  lib/{api,firebase,audio,live,i18n}/  messages/{en,hi}.json
│   └── styles/tokens.css   apphosting.yaml
├── services/api/
│   ├── app/main.py  settings.py  auth.py  store.py           # Firestore access in one module
│   ├── app/schemas/            # Pydantic request/response models (OpenAPI source)
│   ├── app/core/answer.py      # channel-agnostic desk core (§3.3)
│   ├── app/agents/             # estimate_reader, desk_live, life_event, claim_reader, appeal_drafter, doc_reader, verifier, prompts/*.md
│   ├── app/live/               # WebSocket ↔ ADK run_live bridge
│   ├── app/channels/whatsapp/  # meta.py, twilio.py, webhook.py, media.py, tts.py
│   ├── app/routers/            # demo, households, documents, plans, life_changes, actions, desk, claims, proof
│   ├── app/templates/          # letter HTML
│   ├── tests/  fixtures/       # recorded model outputs for FAKE_LLM=1
│   └── Dockerfile  pyproject.toml
├── packages/engine/kavach_engine/{hospital,claim,cover_map,needs,budget,optimise,diff,score,calendar,say,rules}.py + tests/
├── data/{rules/IN, personas, samples, wordings, catalog}/
├── evals/{labels, run_eval.py, results}/
├── infra/{firebase.json, firestore.rules, firestore.indexes.json, storage.rules, bootstrap.sh, deploy.sh}
├── scripts/{seed_demo.py, ingest_wordings.py, fetch_wordings.py}
└── .github/workflows/{ci.yml, deploy.yml}
```

### 3.3 The one design rule that makes WhatsApp cheap

All three doors (live desk, text-and-photo desk, WhatsApp) call **one function**:

```python
# services/api/app/core/answer.py
async def answer(household: Household, patient_id: str, inputs: DeskInputs, locale: str) -> DeskAnswer
#   DeskInputs: estimate: HospitalEstimate | None, utterance_text: str | None,
#               room_options: list[RoomOption] | None, billing_type_answer: str | None
#   DeskAnswer: text (short, for captions/WhatsApp text), say (engine-built Hindi/English line),
#               cards: list[DeskCard], question_for_desk: str | None, trace: list[RuleFiring]
```

- The live agent's `evaluate_options` tool is a thin wrapper over `answer()`; the agent must speak `say` verbatim for any rupee amount.
- The WhatsApp webhook turns a voice note into text (Gemini audio understanding), a photo into an estimate (estimate reader), calls `answer()`, then sends `text`, a TTS voice note of `say`, and the card PNG.
- Nothing in `channels/` or `live/` computes a number or decides a rule.

## 4. Work packages

Owner key: **K** = Kshitij, **J** = Jai, **A** = a Claude agent (one agent per package, own branch, own PR). "Gate" is the integration gate (§5) the package must pass.

| WP | Name | Owner | Owns (paths) | Depends on | Gate |
|---|---|---|---|---|---|
| 0 | Scaffold, infra, CI/CD | A + K (GCP, billing, accounts) | repo root, `infra/`, `.github/`, Dockerfile, app shells | – | G0 |
| 1 | Rules engine: hospital + claim | A; J signs off rules | `packages/engine` (hospital, claim, say, rules), `data/rules/IN` | – | G0 |
| 2 | Estimate reader + sample estimate | A; K prints/photographs | `agents/estimate_reader.py`, `data/samples/estimate_*` | WP-1 models | G0 |
| 3 | Desk core `answer()` + text-and-photo desk API | A | `app/core`, `routers/desk.py` | 1, 2 | G0 |
| 4 | Web: design system + desk screens + landing | A | `apps/web` tokens, S01, S21–S24, S09m | 0, 3 (fixtures first) | G0/G1 |
| 5 | WhatsApp door | A; K owns Meta/Twilio accounts | `app/channels/whatsapp`, `app/api/og/card` | 3 | G0 (text+photo) / G1 (voice) |
| 6 | Live desk (audio-only) | A; K tests on phone | `app/live`, `agents/desk_live.py`, `apps/web/lib/{audio,live}` | 3 | G1 |
| 7 | Demo data, seeding, demo mode | A | `data/personas`, `scripts/seed_demo.py`, `routers/demo.py` | 0, 1 | G0 |
| 8 | Documents and citations | A | `agents/doc_reader.py`, ingest, clause store + viewer API, S14–S16 | 0 | G2 |
| 9 | Job change (moment 1) | A | engine cover_map/needs/budget/optimise/diff, `agents/life_event.py`, migration letter, S09, S17–S20, WhatsApp nudge | 1, 5, 8 | G2 |
| 10 | Claim appeal (moment 3) | A | `agents/{claim_reader,appeal_drafter,verifier}.py`, letter PDF, S30–S32 | 1, 8 | G2 |
| 11 | Proof page and evals | J labels; A builds harness | `evals/`, `data/wordings`, S26 | 8 | G3 |
| 12 | Remaining screens and onboarding | A | S02–S08, S10–S13, S25, S27–S29, desktop layouts, Hindi strings | 4, 9 | G3 |
| 13 | Plan-doc updates | A (docs) | `docs/plan/*` per red-team-response §9 | – | G3 |
| 14 | Video, deck, README, submission | K + J | `docs/deck/`, README, video files outside git | all | Submit |

### WP-0 Scaffold, infra, CI/CD
- **Build:** pnpm + Turborepo + uv workspace; Next.js 16 app shell with tokens; FastAPI app with `/health`; Dockerfile (Python 3.13 slim + ffmpeg + WeasyPrint deps); Firebase config; `infra/bootstrap.sh` enabling APIs (run, aiplatform, firestore, storage, secretmanager, artifactregistry, cloudbuild, firebase, firebaseapphosting); `deploy.sh`.
- **CI:** on PR: ruff, mypy (strict on engine), pytest, `openapi-typescript` drift check, web typecheck/lint/build, Vitest, Playwright smoke with `FAKE_LLM=1`. On merge to `main`: Cloud Build → Artifact Registry → Cloud Run `kavach-api` (asia-south1 unless the model check says otherwise; min 1, max 5, timeout 3600 s, session affinity, CPU always allocated); App Hosting deploys `apps/web` from `main` (min instances 1).
- **Secrets:** Meta token, Meta app secret, webhook verify token, Twilio auth token, demo admin key in Secret Manager. GitHub secret scanning on before the repo goes public.
- **K only:** create the GCP project and billing, Firebase project, budget alert, Workload Identity Federation for GitHub Actions, Meta developer app + test number, Twilio account + sandbox.
- **Done when:** an empty app and `/health` are live on their public URLs from a merge to `main`.

### WP-1 Rules engine: hospital and claim
- **Build:** `hospital.evaluate(ctx, estimate, room_options) -> DeskEvaluation` and `claim.assess(letter, bill, terms) -> ClaimAssessment`, both returning a `trace`. Inputs carry `pricedByRoom` per head and `billingType ∈ {differential, flat, package, unknown}`.
- **Rules:** R-HL-001 (ratio only on room-priced heads; never pharmacy, consumables, implants, devices, diagnostics, ICU), R-HL-002 (ICU never proportionately deducted; ICU limit still caps ICU rent), R-HL-006 (policy order), R-HL-010 (unknown billing → both branches + one question), package branch (no ratio; ask for the package price in the lower category), R-CLM-002, R-CLM-008, co-pay, deductible, non-payables. Rules pack YAML with `sources[]` and `status`.
- **`say.py`:** formats amounts the Indian way (₹1,50,800) and in Hindi words for speech ("ek lakh pachaas hazaar aath sau"), and builds the spoken line from the evaluation, so the agent never composes a number.
- **Tests first** (these are the contract):
  - `test_hx1_differential`: Option A OOP **₹1,50,800**, Option B OOP **₹60,800**, saving **₹90,000**; Option A deduction ₹80,000 on room-priced heads.
  - `test_hx1_flat_billing`: OOP ₹86,800 vs ₹70,800, saving **₹16,000**.
  - `test_hx1_unknown_billing`: returns both branches and `question_for_desk`.
  - `test_hx1_package`: no ratio applied; returns the package question.
  - `test_icu_never_deducted`.
  - `test_cx1`: approved **₹2,04,640**, recoverable **₹14,560**, and approved + recoverable = ₹2,19,200 = Option B expected payout.
  - Hypothesis property tests: deduction never touches excluded heads; OOP ≥ 0; payout ≤ sum insured.
- **J signs off** R-HL-001/002/006/010 and R-CLM-008 against the circular paragraph numbers (§7) and flips `status` to `verified`.

### WP-2 Estimate reader and sample estimate
- **Build:** `read_estimate(images) -> HospitalEstimate` with Pro, structured output: hospital, patient, procedure, admission type, room categories with rent/day, **line items per room category** with `pricedByRoom`, package flag, totals, and a confidence per field. Arithmetic check (line items sum to total) runs in code; a mismatch returns `needs_confirmation`.
- **Sample:** `data/samples/estimate_city_heart.pdf` and `.png`, a realistic City Heart Hospital estimate carrying the HX-1 room-category tariff table (red-team-response §3), marked SAMPLE. K prints it and photographs it on a desk in normal light (5 photos, including one at an angle and one with glare) for tests.
- **Done when:** all 5 photos parse to the exact HX-1 numbers, or flag `needs_confirmation` rather than return a wrong number.

### WP-3 Desk core and text-and-photo desk
- **Build:** `core/answer.py` (§3.3); routes from [plan/06-api.md](plan/06-api.md) "Moment 2" (sessions, captures, turns, evaluate, end); context pack (patient, covering policies with terms, claims YTD); short Hindi and English replies built from `say`; the super top-up line (no card).
- **Guards:** insurance-only scope; no medical advice; every answer ends with "confirm with the TPA desk"; per-IP and per-household rate limits; daily live-minutes ceiling in Firestore that flips the desk to text mode.
- **Done when:** `POST captures` with a sample photo then `POST turns` "kaun sa room lein?" returns the ₹60,800 / ₹1,50,800 cards and the Hindi `say` line, in under 10 s.

### WP-4 Web: design system, desk and landing
- **Build:** tokens from [plan/07-design-system.md](plan/07-design-system.md) (indigo #2E45A0, marigold #F4A62A accent, sand neutrals, desk theme); components (AnswerCard with ✓, AgentSteps, WhyPanel, CitationChip, Captions); screens S01 landing (with **"Try the hospital scene"** and the WhatsApp sandbox QR), S09m member home, S21 hospital start, S22 live desk (text mode first), S23 answer cards, S24 session summary. Hindi strings for all desk screens.
- **Why panel** shows the tariff columns that drove the deduction, the rule IDs and the billing branch ("₹16,000 if the hospital doesn't price by room").
- **Builds on fixtures** (`FAKE_LLM=1`) until WP-3 lands.
- **Done when:** on an Android phone, a judge-like user taps "Try the hospital scene" and reaches the ₹90,000 answer in under a minute.

### WP-5 WhatsApp door
- **Build:** one webhook route with two adapters (Meta Cloud API: GET verify, POST receive, `X-Hub-Signature-256` check, media download, upload-and-send; Twilio: signature check, `MediaUrl` download, send with public media URL from a signed GCS link). Map sender number → household member. First-message consent text (DPDP) and opt-in stored; media deleted after processing.
- **Layer 0:** photo + text in → `answer()` → text reply + card PNG (from `apps/web/app/api/og/card`) + link to the full card.
- **Layer 1:** voice note (OGG/Opus) → Gemini audio understanding → `answer()`; reply voice note via Gemini TTS → PCM → `ffmpeg` OGG/Opus. **Household alert** to Rahul when Kamala uses either door ("Mummy is at City Heart Hospital. Kavach told her to ask for the ₹5,000 room. Tap to see.").
- **Layer 2:** job-change nudge ("15 Nov: ask Acme HR to migrate Mummy and Papa's cover… reply YES") and settlement-letter forwarding → claim verdict + appeal PDF.
- **Proactive messages (alert and nudge) need a delivery path of their own.** Kamala's message opens a 24-hour window only for Kamala, not for Rahul, and the dated nudge is business-initiated. So:
  - **Meta (video):** submit two utility templates in hour one, `household_alert` and `dated_reminder`, with the hospital, room and date as variables; send them through the template API. Until they are approved, Rahul's number messages the bot first before each take, so a free-form reply inside his own window is valid.
  - **Twilio sandbox (judges):** custom templates aren't allowed, so the alert and nudge are sent only to numbers inside their own 24-hour window. The judge flow on the landing page has the judge message the sandbox as Rahul ("RAHUL") before trying the desk, so the alert reaches their own phone; anyone outside a window sees the alert in the app instead.
  - The sender checks the recipient's last inbound time and picks template, free-form, or in-app only; it never sends free-form outside a window.
- **Limits:** per-sender rate limit; off-topic messages get a polite insurance-only reply; the README states the window and template limits honestly.
- **Done when:** from a fresh phone that joined the Twilio sandbox, a photo + Hindi voice note returns the Hindi voice note and card; Rahul's number receives the alert.

### WP-6 Live desk (audio-only)
- **Build:** WebSocket `/v1/live/{sessionId}` bridging the browser to ADK `run_live` with `LiveRequestQueue`; `RunConfig` with audio response, chosen Hindi voice, input/output transcription, VAD tuned for noise, session resumption and context-window compression. Tools: `get_patient_context`, `read_estimate` (returns the latest capture or `needs_capture`), `evaluate_options` (→ `answer()`), `search_clauses`, `emit_card`. System prompt from [plan/03-gemini-and-agents.md](plan/03-gemini-and-agents.md) §4.6, updated: speak `say` strings verbatim, ask the R-HL-010 question when billing is unknown, insurance-only.
- **Browser:** mic `AudioWorklet` 16 kHz PCM chunks; 24 kHz playback ring buffer; flush on `interrupted`; camera preview with a Capture button that uploads a still; captions; reconnect with backoff; automatic fallback to the WP-3 text mode on error, with a banner.
- **First spike (hour one):** echo audio through Cloud Run WebSocket to the live model and back on an Android phone. If the native-audio model isn't on Vertex in our region, use the nearest region or the Gemini Developer API path (still Google).
- **Done when:** the 10-scenario spoken rehearsal ([plan/03](plan/03-gemini-and-agents.md) §11) passes on a real phone, first audio in ≤ 1.5 s typical, barge-in works, and every spoken rupee amount matches the card.

### WP-7 Demo data, seeding, demo mode
- **Build:** `data/personas/sharma.json` (Rahul, Priya, Kamala, Suresh; Kamala and Suresh moved from Lucknow; Acme group cover with parents, retail parents' policy with ₹5,000 room limit and 20% co-pay, super top-up with ₹5,00,000 deductible); `seed_demo.py`; `POST /v1/public/demo` (anonymous auth → clone Sharma household per visitor); demo checkpoints (setup, job_change, hospital, claim) and demo clock; S29 controls.
- **Done when:** each checkpoint resets in under 3 s and every screen reads from the clone, so judges never collide.

### WP-8 Documents and citations
- **Build:** document upload to Storage → classify → schedule/benefits extraction (Pro) with evidence → policy facts with citations; wording ingest (segment clauses, embed, Firestore vector index) via `scripts/ingest_wordings.py` for the Sharma policies and the eval wordings; clause search and clause viewer API; S07 documents, S14 vault, S15 policy detail, S16 clause viewer (quote + page number; highlight boxes are Layer 3).
- **Done when:** the three Sharma sample documents produce the household's policies with a citation chip on every term the hero and claim depend on (room limit, co-pay, proportionate deduction clause, ICU, non-payables).

### WP-9 Job change (moment 1)
- **Build:** engine `cover_map`, `needs`, `budget`, `optimise`, `diff` and test PX-1 ([plan/05](plan/05-rules-engine.md) §11); `LifeEventAgent` (text → change set with dates); S09 cover map with date scrubber, S17–S20 (change, confirm, re-plan diff, action review); migration letter (WeasyPrint PDF) approved by Rahul; the dated WhatsApp nudge (WP-5).
- **Migration window:** keep "check with HR" on screen unless J verifies the rule.
- **Done when:** "Joining a startup on 1 Dec" turns the parents' cells red on 1 Dec, shows the diff and budget change, and produces the letter and the nudge.

### WP-10 Claim appeal (moment 3)
- **Build:** settlement letter reader (Pro) → `claim.assess` → deductions table with valid / challengeable / possibly; appeal drafter (Pro) citing the clause and R-CLM rules; verifier on the letter text (quotes match clauses, numbers match the engine); PDF; S30–S32. Sample settlement letter for CX-1 in `data/samples/`.
- **Done when:** the sample letter yields "Up to ₹14,560 may be recoverable" and a verified appeal PDF.

### WP-11 Proof page and evals
- **Build (A):** `data/wordings/manifest.yaml` (public wordings by UIN + URL, fetched by script, PDFs not committed); `evals/run_eval.py` comparing extracted terms with labels; results JSON + markdown; S26 Proof page reading the latest results; offline transcript check of the rehearsal recordings (spoken amounts vs engine).
- **Labels (J):** 8 wordings; agents pre-fill each label file, J checks and corrects (~10 min each).
- **Done when:** S26 shows accuracy per field on 8 wordings with the date and the honest count.

### WP-12 Remaining screens and onboarding
S02 sign-in, S03 consent, S04 family sentence (intake agent), S05 family card, S06 money, S08 smart questions, S10 cell detail, S11 plan, S12–S13 sheets, S25 timeline, S27 settings, S28 family access, desktop layouts, dark theme. English first; Hindi where cheap.

### WP-13 Plan-doc updates
Apply every row of red-team-response §9 to `docs/plan/01–12` and the plan README (₹90,000 hero, WhatsApp door, audio-only live, plain Firestore, new rules, revised video timings), and point 10-build-plan §4 at this file. Docs only; no behaviour change. Owner thread: whoever owns the docs PR at the time.

### WP-14 Video, deck, README, submission (humans)
Revised shot list (red-team-response §4–§5: hook 10 s, setup 10 s, job change 25 s, **hospital 90 s**, claim 15 s, proof 25 s); 12-slide deck ([plan/09](plan/09-demo-data-and-script.md) §5, slide 6 names exactly what Gemini does); README with live link, QR, video, architecture, model IDs and honest notes (8 wordings, sandbox 24-hour window, samples are synthetic); submission form.

## 5. Layers, gates and the clock

**T = submission cut-off.** Assumed Sun 18 Oct 18:00 IST until Kshitij confirms it. If T is later, the extra time goes to Layer 3 and rehearsal; if it is earlier, shift every gate back by the same amount and cut from the end of the Layer 3 list.

| Layer | What is live after it | Packages | Gate (who, when) |
|---|---|---|---|
| **Hour one** (Fri ~19:30–21:00) | Nothing user-facing; decisions recorded | First-hour checks (§6), WP-0 scaffold, WP-1 tests written | – |
| **Layer 0: the spine** (Fri night) | Deployed app: "Try the hospital scene" → sample estimate photo → engine → Hindi answer and cards, by text in the app **and** on WhatsApp (photo + text) | WP-0, WP-1, WP-2, WP-3, WP-4 (desk in text mode), WP-5 (L0), WP-7 | **G0, Sat 02:00 IST**, K + J on a phone: HX-1 numbers exact on all 5 photos |
| **Layer 1: the hero** (Sat early morning) | Live Hindi voice desk on a phone; WhatsApp voice notes both ways; Rahul's alert; Why panel with billing branch | WP-6, WP-5 (L1), WP-4 (live UI) | **G1, Sat 10:00 IST**: hero scene end to end, 3 clean runs in a row |
| **Layer 2: the other moments** (Sat day) | Job change with diff, letter and nudge; claim appeal with PDF; citations on all hero and claim terms | WP-8, WP-9, WP-10, WP-5 (L2) | **G2, Sat 18:00 IST**: full demo path on the live URL. **Nothing new is added after G2** |
| **Layer 3: breadth and proof** (Sat night) | Proof page on 8 wordings; onboarding and remaining screens; desktop layout; plan docs updated | WP-11, WP-12, WP-13 | **Freeze, T−8 h (Sun 10:00 IST)**: only bug fixes after this |
| **Ship** (Sun) | Video, deck, README, submission | WP-14 | Submit by **T−3 h (Sun 15:00 IST)** |

**Gate rules.** A gate passes only on the deployed URL and a real Android phone, never on localhost. If a gate fails, every agent stops new work and fixes the failing path first. The Playwright demo-path test (landing → demo → job change → desk text mode with fixtures → claim) must stay green on `main` from G0 onwards.

**Layer 3 cut order** if the clock forces it: dark theme → desktop layouts → clause highlight boxes → S12/S13 sheets → family invites (Kamala uses the demo link) → premium calendar detail → onboarding screens other than S04/S05/S07. **Never cut:** the hero with the correct number, the WhatsApp fallback, citations + verifier, engine-computed numbers, the Proof page, demo mode.

## 6. First-hour checks (before any agent starts its package)

| # | Check | Owner | Output |
|---|---|---|---|
| 1 | Read the exact cut-off time and time zone from the dashboard | K | Update T in §5 |
| 2 | List Gemini Pro, Flash, Live native-audio, TTS and embedding models available on Vertex in asia-south1 (else nearest region / global / Developer API) | A + K | Model IDs and region in `settings.py` and README |
| 3 | Live spike: audio echo through Cloud Run WebSocket on an Android phone | A + K | Go / fallback decision for WP-6 |
| 4 | Hindi voice audition: two voices, five script lines with English insurance words | K | `KAVACH_LIVE_VOICE` and TTS voice |
| 5 | Meta test number and Twilio sandbox both reach one hello-world webhook; submit the `household_alert` and `dated_reminder` utility templates to Meta | K | Webhook URL, both senders verified, templates pending approval |
| 6 | Open the IRDAI 2024 master circular PDF; copy the proportionate-deduction, ICU and multiple-policy paragraph numbers | J | `sources[]` in `data/rules/IN` |

## 7. Human-only work (the real critical path)

| Job | Who | Hours | When |
|---|---|---|---|
| Cloud, Firebase, Meta, Twilio accounts and billing | K | 1.5 | Hour one |
| Rules sign-off against the circular (6 rules) | J | 2 | Fri night |
| Voice audition and Hindi script check | K | 1 | Hour one |
| Print and photograph the estimate and settlement letter | K | 1 | Fri night, after WP-2's sample |
| Integration gates G0, G1, G2 and freeze (4 × ~1.5 h) | K + J | 6 | Fixed times (§5) |
| Label 8 wordings (agent pre-filled) | J | 1.5 | Sat |
| Filming: Kamala (a Hindi-speaking older relative or friend, booked for 2 h), Rahul, WhatsApp shots, 5+ takes of the hero; edit | K + J | 6 | Sat afternoon and evening |
| Deck (12 slides) | J | 3 | Sat night |
| Phone test, fresh-number sandbox test, submission form | K | 2 | Sun |
| **Total** | | **~24** | Split across two people, with sleep |

Book the person playing Kamala tonight.

## 8. Running the Claude agents

- **One package, one agent, one branch, one PR.** Branch `feat/wp-<n>-<slug>`; small commits; PR to `main` with CI green before merge. No squashing (honest history).
- **Brief = this file's WP section + the plan docs it cites + the paths it owns.** An agent never edits paths owned by another package; if it needs a change there, it opens an issue or asks through the thread.
- **Shapes first.** WP-1 publishes `DeskEvaluation`, `HospitalEstimate`, `ClaimAssessment` models in the first hour; WP-3 publishes `DeskInputs`/`DeskAnswer` and the OpenAPI spec. Web and WhatsApp work against those with fixtures until the real thing lands.
- **Fixtures for every model call** (`FAKE_LLM=1`) recorded from one real run, so UI and tests don't need live Gemini.
- **Merge order** follows the dependency column in §4. Humans merge at gates; between gates an agent may merge its own PR only if CI is green and it doesn't touch the demo path.
- **Parallelism by layer:** Layer 0 runs WP-0, 1, 2, 4, 7 at once (WP-3 and WP-5 start once WP-1's models exist); Layer 1 runs WP-5 and WP-6 together; Layer 2 runs WP-8, 9, 10 together; Layer 3 runs WP-11, 12, 13 together.

## 9. Testing

| Level | What | Tool |
|---|---|---|
| Engine | HX-1 (all four branches), ICU, CX-1, PX-1, properties | pytest, hypothesis |
| Agents | Golden outputs on fixtures; 5 estimate photos; adversarial inputs (blurry, wrong document, off-topic, prompt injection in a document) | pytest + one live nightly run |
| API | Desk, demo, claims, WhatsApp signature verification, rate limits, authz (non-member can't read) | pytest + Firebase emulators |
| Web | Components, i18n keys present in `en` and `hi`, ₹-literal guard | Vitest + Testing Library |
| E2E | Demo path with fixtures | Playwright on CI and against the live URL |
| Live | 10-scenario spoken rehearsal; spoken amounts vs cards | Manual checklist + offline transcript check |
| WhatsApp | Fresh number joins sandbox → photo + voice note → reply + alert | Manual, at G0/G1 and on Sunday |

## 10. Keeping the live link alive (19 Oct – 6 Nov judging)

Cloud Run and App Hosting min instances 1; per-IP and per-WhatsApp-number rate limits; 5-minute cap per live session; daily live-minutes ceiling that switches the desk to text mode; GCP budget alert; demo households cloned per visitor and deleted after 30 days; uptime check on `/health`.

## 11. Risks during the build

| Risk | Mitigation |
|---|---|
| Live model not available or flaky in our region | First-hour check; Developer API path; text-and-photo and WhatsApp doors already work from Layer 0 |
| Estimate misread | Pro on a still, arithmetic check, user confirms parsed lines, manual 3-number entry after two failed reads |
| Hindi voice sounds wrong with English insurance words | Voice audition before the prompt is written; `say` strings tuned by K |
| Parallel agents collide | Path ownership in §4, shapes first, fixtures, gates |
| Wrong regulatory rule | J's sign-off; hero rules must be `verified` before G1; UI shows "check with your insurer" only on rules still `to_verify` |
| Meta test number limits (5 recipients) | Video uses Meta; judges use the Twilio sandbox QR |
| Proactive WhatsApp messages blocked outside the 24-hour window | Meta utility templates for the video; recipient messages first in the sandbox; in-app alert as the fallback (WP-5) |
| Scope creep after Saturday 18:00 | G2 freezes features; only the Layer 3 list continues |
| Cut-off earlier than assumed | Shift gates back; cut from the end of the Layer 3 list |

## 12. Next steps once Kshitij says go

1. K: confirm T, create cloud and messaging accounts (§6 #1, #5).
2. Start WP-0 and WP-1 agents immediately; WP-2, WP-4, WP-7 agents in parallel within the hour.
3. J: circular paragraphs and rules sign-off (§6 #6).
4. K: live spike and voice audition (§6 #3, #4).
5. Book Kamala's filming slot for Saturday afternoon.
