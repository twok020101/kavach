# 02 · System architecture

**How Kavach is put together on Google Cloud, why each piece is there, and how a request flows through it for each moment.** Gemini specifics (models, agents, prompts, verification, evaluation) are in [03-gemini-and-agents.md](03-gemini-and-agents.md). Storage schemas are in [04-data-model.md](04-data-model.md). Endpoint contracts are in [06-api.md](06-api.md).

---

## 1. Constraints that shaped the design

| Constraint | Source | Consequence |
|---|---|---|
| Must use Gemini / Google agent tools | Hackathon rules | Gemini on Vertex AI for every model call; Google ADK (Agent Development Kit) for agent orchestration and live streaming |
| Must deploy on Cloud Run or Firebase | Hackathon rules | API on **Cloud Run**; web on **Firebase App Hosting** (which itself runs on Cloud Run) |
| 40% of score is Gen AI depth | Judging | Multimodal ingest, live voice + vision, multi-agent with tools, verifier, measured evaluation |
| Rupee numbers must be auditable | Principle P3 | A pure, deterministic, unit-tested **engine** package; LLMs call it as a tool, never compute ₹ themselves |
| Must become a real business | Kshitij | Event-sourced household, fact provenance, per-country rules packs, connector interface for AA/insurers |
| Latest libraries, industry-standard structure | Kshitij | Monorepo, typed contracts, current stable versions (section 7) |

## 2. The system at a glance

```
                          ┌──────────────────────────────────────────────────────┐
                          │                 Browser / phone (PWA)                │
                          │  Next.js app · mic (PCM 16 kHz) · camera (JPEG)      │
                          └───────┬───────────────┬──────────────────┬───────────┘
                     HTTPS (SSR)  │     HTTPS JSON│        WebSocket │ (live desk)
                                  ▼               ▼                  ▼
┌───────────────────────────┐   ┌────────────────────────────────────────────────┐
│ Firebase App Hosting      │   │ Cloud Run: kavach-api (Python, FastAPI + ADK)  │
│  apps/web (Next.js SSR)   │   │                                                │
│  - pages, i18n, auth UI   │   │  REST  /v1/...      WS /v1/live/{session}      │
└──────────┬────────────────┘   │  ┌──────────────┐  ┌─────────────────────────┐ │
           │ Firebase Auth      │  │ Command layer│  │ ADK agents (03 doc)     │ │
           │ (ID tokens)        │  │ validates,   │  │ intake · document ·     │ │
           ▼                    │  │ appends      │  │ question · life-event · │ │
┌───────────────────────────┐   │  │ events,      │  │ advisor · desk (live) · │ │
│ Firebase Auth             │◄──┤  │ projects     │  │ claim · verifier        │ │
└───────────────────────────┘   │  │ state        │  └───────────┬─────────────┘ │
                                │  └──────┬───────┘              │ tool calls    │
                                │         ▼                      ▼               │
                                │  ┌────────────────────────────────────────┐    │
                                │  │ packages/engine (pure Python)          │    │
                                │  │ needs · budget · optimise · cover_map  │    │
                                │  │ calendar · diff · hospital · claim     │    │
                                │  │ + rules packs (data/rules/IN/*.yaml)   │    │
                                │  └────────────────────────────────────────┘    │
                                └──────┬──────────────┬───────────────┬──────────┘
                                       │              │               │
                     ┌─────────────────▼───┐  ┌───────▼────────┐  ┌───▼───────────────────┐
                     │ Firestore (Native)  │  │ Cloud Storage  │  │ Vertex AI              │
                     │ households, events, │  │ uploads, PDFs, │  │ Gemini Pro / Flash /   │
                     │ projections, plans, │  │ page images,   │  │ Live, embeddings       │
                     │ clauses + vectors   │  │ generated PDFs │  │                        │
                     └─────────┬───────────┘  └────────────────┘  └────────────────────────┘
                               │ realtime listeners (read-only, security rules)
                               └──────────────────────────► Browser

   Background:  Cloud Tasks queue "ingest" → kavach-worker (Cloud Run, same image) for long PDF ingest
   Observability: Cloud Logging, Cloud Trace (OpenTelemetry), Error Reporting
   Secrets: Secret Manager · CI/CD: GitHub Actions → Artifact Registry → Cloud Run / App Hosting
```

### Key architectural decisions

| # | Decision | Why | Alternative rejected |
|---|---|---|---|
| AD-1 | **Writes go through the API; reads come straight from Firestore listeners** | Event sourcing needs one writer that validates and appends; realtime reads make the UI feel alive (cover map turns red as the event lands) with no polling | All reads through API (slower UI, more code) |
| AD-2 | **Event-sourced household** (append-only `events`, materialised `projection`) | Timeline, diffs, "remembering" and audit come for free; connectors are just more event writers | CRUD on a household doc (no history, diffs need hacks) |
| AD-3 | **Deterministic engine as a separate pure package** | Auditable ₹ numbers; unit tests; reusable by agents, API and eval harness; can port to other countries via rules packs | Letting Gemini compute numbers (unverifiable) |
| AD-4 | **Live desk proxied through Cloud Run with ADK bidi-streaming** (browser ↔ our WebSocket ↔ Gemini Live) | The live agent must call our tools (engine, policy lookup) with server credentials and household data; keeps keys server-side; lets us log and verify | Browser connecting straight to Gemini Live (no server tools, keys exposed) |
| AD-5 | **Estimate reading is a separate high-accuracy call, not just live video** | Live video frames are low-resolution and ~1 fps; line-item amounts must be exact. The desk agent triggers a still-photo extraction with a Pro-class model and injects the structured result | Relying on live frames alone (misread amounts) |
| AD-6 | **Product wordings are a shared library, parsed once** | A policy wording is the same for every buyer of a product (same UIN). Parse into clauses + terms once; every household's policy schedule links to it. Cheaper and makes the accuracy eval meaningful | Re-parsing each upload |
| AD-7 | **Clause retrieval with Firestore vector search** | One database; `find_nearest` on clause embeddings is enough at this scale | Separate vector DB (more infra, no gain for a hackathon) |
| AD-8 | **One container image for API and worker** | Simpler build; worker is the same code with a different entrypoint | Separate services/images |
| AD-9 | **Monorepo with typed contracts** (Pydantic models → JSON Schema → TypeScript types) | Web and API never disagree on shapes; parallel agents can build against contracts on day 1 | Hand-written duplicate types |

## 3. Components

### 3.1 `apps/web`: Next.js web app (Firebase App Hosting)

- **Responsibilities:** all screens in [08-screens.md](08-screens.md); auth UI; i18n (English/Hindi); audio capture and playback; camera; PWA install; demo mode.
- **Rendering:** App Router. Marketing and proof pages are server components (fast first paint for judges). App screens are client components subscribed to Firestore.
- **Data access:**
  - Reads: Firebase JS SDK `onSnapshot` on the household projection, plans, actions, sessions (security rules allow members of the household to read).
  - Writes: `fetch` to `kavach-api` with the Firebase ID token in `Authorization: Bearer`. TanStack Query for mutations and optimistic UI.
  - Uploads: direct to Cloud Storage via Firebase Storage SDK into `households/{hid}/uploads/{uploadId}/{filename}` (rules restrict path to members), then `POST /v1/households/{hid}/documents` to register and trigger ingest.
- **Live desk:** a WebSocket to `wss://api.../v1/live/{sessionId}`. An `AudioWorklet` captures mic audio, downsamples to 16 kHz 16-bit PCM mono, sends 20–40 ms chunks. Camera frames as JPEG (≤ 1 fps, 768 px long side) for context; a "Capture estimate" button sends a full-resolution still for exact reading. Playback of 24 kHz PCM via an `AudioWorklet` ring buffer; stop playback immediately on an `interrupted` message (barge-in).

### 3.2 `services/api`: Kavach API (Cloud Run, Python)

- **FastAPI** app with routers per area (households, documents, events, plans, actions, desk, claims, evals, demo).
- **Auth middleware:** verifies Firebase ID token (Firebase Admin SDK), loads the caller's household role (`owner`, `member`) from Firestore, rejects otherwise.
- **Command layer** (`app/commands/`): one handler per command (e.g. `RecordLifeChange`). Each handler: validate → call agents/engine as needed → build event(s) → append in a Firestore transaction with optimistic concurrency on `household.version` → re-project → recompute plan if inputs changed → return.
- **Projector** (`app/projection/`): pure function `project(events) -> HouseholdState`, plus incremental `apply(state, event)`. Shared with tests.
- **Agents** (`app/agents/`): ADK agent definitions, tools, prompts (03 doc).
- **Engine adapter:** imports `kavach_engine` (the package) and the rules pack for the household's country.
- **Live gateway** (`app/live/`): WebSocket endpoint bridging the browser to an ADK live run (`Runner.run_live` with a `LiveRequestQueue`).
- **Deployment:** Cloud Run service `kavach-api`, region `asia-south1` (Mumbai; Indian data residency story) or `asia-southeast1` (Singapore) if a model isn't available in Mumbai. Min instances 1 (no cold start during judging), max 10, concurrency 40, request timeout 3600 s (WebSockets), CPU always allocated (needed for live streaming), session affinity on.

> **Model region check (build day):** confirm the chosen Gemini Pro, Flash, Live and embedding models are available in the chosen Vertex AI region. If not, keep Cloud Run in `asia-south1` and call Vertex AI in the nearest region that has them, or use the `global` endpoint where supported. Record the decision in the README.

### 3.3 `services/api` worker entrypoint (Cloud Run, same image)

- Service `kavach-worker`, private (no unauthenticated access), invoked by **Cloud Tasks** queue `ingest` with OIDC tokens.
- Jobs: `ingest_document` (classify → extract → for wordings: segment clauses, embed, extract terms), `run_eval` (evaluation harness), `render_pdf` (letters).
- Retries with exponential backoff; idempotent by `documentId` + `stage`.

### 3.4 `packages/engine`: deterministic rules engine (pure Python)

- No I/O, no network, no LLM. Inputs and outputs are Pydantic models from `packages/contracts`.
- Modules: `needs`, `budget`, `optimise`, `cover_map`, `calendar`, `diff`, `hospital`, `claim`, `score`.
- Every rule has an ID (e.g. `R-HL-001`) and returns a `Trace` explaining which rules fired with which inputs. The trace is what the UI's "Why" panel and the agents use to explain.
- Rules packs: `data/rules/IN/*.yaml` (India). `data/rules/SG/` later. See [05-rules-engine.md](05-rules-engine.md).

### 3.5 `packages/contracts`: shared types

- Source of truth: Pydantic v2 models in `packages/contracts/python/kavach_contracts/`.
- Build step exports JSON Schema to `packages/contracts/schema/*.json`, then generates TypeScript types into `packages/contracts/ts/` (with `json-schema-to-typescript`). The web app imports `@kavach/contracts`.
- Gemini structured-output schemas are derived from the same Pydantic models, so extraction output parses straight into domain types.

### 3.6 Data stores

| Store | Holds | Notes |
|---|---|---|
| **Firestore (Native mode)** | Users, households, events, projections, plans, actions, documents metadata, product library, clauses (+ embeddings), desk sessions, claim cases, eval runs | Realtime listeners for UI; vector index on clause embeddings |
| **Cloud Storage** bucket `kavach-<env>-docs` | Uploaded files, rendered page images (for clause highlight), generated letters (PDF), audio snippets (opt-in, off by default) | Uniform bucket-level access; object lifecycle: demo uploads deleted after 30 days |
| **Secret Manager** | Any non-Google API keys (none needed for MVP), demo admin key | Service account access only |
| **BigQuery** (later) | Firestore export for analytics, eval history | Not needed for hackathon |

### 3.7 Google AI services

Detailed in [03-gemini-and-agents.md](03-gemini-and-agents.md). In short:

| Use | Service |
|---|---|
| Reasoning, extraction, verification | Gemini Pro-class model on Vertex AI (latest 3.x) |
| High-volume / low-latency (intake parse, question wording, classification, translation) | Gemini Flash-class model (latest 3.x) |
| Live voice + vision at the desk | Gemini Live API native-audio model on Vertex AI via ADK streaming |
| Clause embeddings | Gemini embedding model on Vertex AI (768-dim output) |
| Agent orchestration | Google ADK (Python) |
| SDK | `google-genai` (unified Gen AI SDK) with `vertexai=True` |

## 4. Request flows

### 4.1 Setup: sentence → household

```
User                 Web                     API                         Gemini            Engine     Firestore
 │ "I'm Rahul, 34..."  │                        │                            │                 │           │
 │────────────────────►│ POST /v1/households     │                            │                 │           │
 │                     │───────────────────────►│ create household, events:   │                 │           │
 │                     │                        │ HouseholdCreated            │──────────────────────────► │
 │                     │ POST /intake {text}     │                            │                 │           │
 │                     │───────────────────────►│ IntakeAgent ──────────────►│ structured      │           │
 │                     │                        │◄───────────────────────────│ MembersDraft    │           │
 │                     │◄── draft (not saved) ──│                            │                 │           │
 │ edits family card   │                        │                            │                 │           │
 │────────────────────►│ POST /commands/confirm-members ─►│ events: MemberAdded×5 (source=said)  │──────────►│
 │ sets 4 money facts  │ POST /commands/set-finances ────►│ FinancesSet                          │──────────►│
 │ uploads 3 docs      │ (Storage upload) + POST /documents ─► DocumentAdded → Cloud Tasks ingest           │
 │                     │                        │ worker: DocumentAgent ────►│ extraction      │           │
 │                     │                        │ events: PolicyExtracted, FactInferred...    ──────────►  │
 │                     │                        │ QuestionPlanner ──────────────────────────► │ ₹ impact │  │
 │◄── chips (≤3) ──────│◄── questions ─────────│                            │                 │           │
 │ taps answers        │ POST /commands/answer ─►│ events: FactStated → plan recompute ───────►│ plan ────►│
 │◄── cover map turns live via onSnapshot ─────────────────────────────────────────────────────────────── │
```

### 4.2 Moment 1: life change

1. `POST /v1/households/{hid}/life-changes:parse {text}` → `LifeEventAgent` returns a `ChangeSetDraft` (typed changes + effective date + confidence + clarifying question if needed). Nothing saved.
2. UI shows the parse ("Rahul: employer changes from Acme to a startup on 1 Dec 2026. Acme group health cover ends 30 Nov 2026."). User confirms.
3. `POST /v1/households/{hid}/life-changes {changeSet}` → command appends `LifeChangeRecorded` + derived events (`EmploymentEnded`, `EmploymentStarted`, `PolicyEnds`), re-projects, runs `engine.plan(state, as_of=effective_date)`, stores `Plan v(n+1)` with `diff` against `v(n)`, generates `Action` drafts via `ActionAgent` (letters filled from state), returns plan + actions.
4. UI receives updates via listeners: cover map scrubs to 1 Dec, parents' health cells turn red, diff sheet opens, checklist appears.
5. User approves an action → `POST /v1/actions/{aid}:approve` → `ActionApproved` event; letter PDF rendered; reminder added to timeline and (optionally) to the user's calendar via an `.ics` download.

### 4.3 Moment 2: hospital desk (live)

```
Kamala's phone            kavach-api (Cloud Run)                     Vertex AI
     │ tap "At the hospital"     │                                           │
     │ POST /desk/sessions {patient: Suresh} ─► create DeskSession, load     │
     │                           │ context pack (policies, terms, conditions,│
     │                           │ bonus, claims this year) ──────────┐      │
     │◄── {sessionId, wsUrl} ────│                                    │      │
     │ WS connect (ID token)     │ ADK Runner.run_live(DeskAgent,     │      │
     │══════════════════════════►│   LiveRequestQueue, RunConfig:     │      │
     │                           │   audio out, input+output          │      │
     │                           │   transcription, Hindi voice) ═════╪═════►│ Gemini Live
     │ PCM audio chunks ════════►│ queue.send_realtime(audio) ════════╪═════►│
     │ "Papa ko admit kiya hai..."                                    │      │
     │                           │◄═══════ audio + transcript ════════╪══════│ "Estimate ki photo dikhaiye"
     │◄══ audio, captions ═══════│                                    │      │
     │ [Capture estimate] JPEG ─►│ EstimateReader (Pro, structured) ──┼─────►│ generate_content
     │                           │◄── EstimateLineItems ──────────────┼──────│
     │                           │ engine.hospital.evaluate(context, estimate, options)
     │                           │ → OptionResults + Trace (rules R-HL-*)    │
     │                           │ Verifier checks the answer draft vs clauses + trace
     │                           │ queue.send_content("TOOL RESULT: ...") ═══►│
     │◄══ audio: "Pehle parents wali policy use kijiye. ₹9,000 wala kamra lene se..."
     │◄── JSON events: answer cards, why-panel items (verified) ──────────────│
     │ (Firestore listener also shows saved cards)                           │
```

- The live model is told **never to state a rupee figure that is not in a tool result**; the verifier also checks the transcript of each spoken answer after the fact and flags mismatches in the Why panel (see 03 §6).
- If the WebSocket fails or the live model is unavailable, the same flow runs as **text + photo** through `POST /desk/sessions/{id}/turns` with the same agent instructions in non-live mode (FR-D-11).

### 4.4 Moment 3: claim appeal

1. Upload letter → `DocumentAdded(kind=claim_letter)` → ingest → `ClaimLetterAgent` extracts `SettlementLetter` (claim no., billed, approved, deductions[]).
2. Command `OpenClaimCase` links it to the desk session/admission and to the policy.
3. `engine.claim.assess(letter, policy_terms, rules_pack, bill)` classifies each deduction with rule IDs; `ClaimAgent` retrieves clauses for each, writes reasons; Verifier checks.
4. `AppealDrafter` writes the grievance letter (English, optional Hindi copy) from a template + verified findings. Action draft created.
5. User edits/approves → PDF rendered → user downloads or opens their email client with prefilled `mailto:` (Kavach never sends).

## 5. Security architecture

| Layer | Control |
|---|---|
| Identity | Firebase Auth (Google sign-in, phone OTP later). Demo mode uses an anonymous Firebase user scoped to a cloned demo household |
| API authz | ID token verified on every call; role from `households/{hid}.access[uid]`; owner-only for destructive commands (delete, invite) |
| Firestore rules | Clients may **read** a household subtree if `request.auth.uid in resource.data.accessUids`; clients may **not write** any household data (all writes server-side). Users can write only their own `users/{uid}` preferences |
| Storage rules | Clients may write only to `households/{hid}/uploads/**` where they are members, max 20 MB, content type PDF/JPEG/PNG/HEIC; read only own household paths |
| Service accounts | `kavach-api-sa`: Firestore user, Storage object admin on the bucket, Vertex AI user, Cloud Tasks enqueuer. `kavach-worker-sa`: same minus Tasks; invoked only by the Tasks queue's OIDC identity |
| Secrets | None in code; Secret Manager for any key; Workload Identity Federation for GitHub Actions deploys (no JSON keys) |
| Data | Google-managed encryption at rest; TLS in transit; PII and health data never written to logs (structured logger with a redaction filter); prompts/responses logged only as IDs and token counts in production |
| Model safety | Vertex AI safety settings at defaults plus our own guardrails (03 §8); no model output is executed |
| Abuse | Per-user rate limits in the API (e.g. 30 model calls/min); upload size limits; App Check on web (reCAPTCHA Enterprise) — S priority |

DPDP/IRDAI aspects are in [11-trust-safety-compliance.md](11-trust-safety-compliance.md).

## 6. Environments and deployment

| Env | Project ID (suggested) | Purpose |
|---|---|---|
| `dev` | `kavach-dev-<suffix>` | Builders' shared environment; emulators locally |
| `prod` | `kavach-prod-<suffix>` | The judged live link; demo data seeded |

- **Local:** Firebase Emulator Suite (Auth, Firestore, Storage) + `uvicorn` for the API + `next dev`. Gemini calls go to the real Vertex AI dev project (no emulator); a `FAKE_LLM=1` mode returns recorded fixtures for offline UI work and tests.
- **CI (GitHub Actions):** on PR: lint, typecheck, unit tests (engine, projector, contracts), web build, Playwright smoke against emulators. On merge to `main`: build image with Cloud Build → Artifact Registry → deploy `kavach-api` and `kavach-worker` to Cloud Run; App Hosting auto-deploys `apps/web` from `main`.
- **Config:** `apps/web/apphosting.yaml` (env vars, min instances 1); `services/api/service.yaml` or `gcloud run deploy` flags in `infra/deploy.sh`.
- **Infra as code:** `infra/` contains `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `firebase.json`, and a short Terraform (optional, S) for service accounts, bucket, Tasks queue. A `infra/bootstrap.sh` enables APIs: `run`, `aiplatform`, `firestore`, `storage`, `cloudtasks`, `secretmanager`, `artifactregistry`, `cloudbuild`, `firebase`, `firebaseapphosting`.

## 7. Technology choices (latest stable; pin exact versions on build day)

| Area | Choice | Notes |
|---|---|---|
| Web framework | **Next.js 16** (App Router), **React 19.2**, **TypeScript 5.9+** | Server components for marketing/proof; client for app |
| Styling | **Tailwind CSS v4**, **shadcn/ui** (Radix primitives), CSS variables for tokens (07 doc) | Tokens map 1:1 to the design system |
| Motion | **Motion** (formerly Framer Motion) | Cover-map transitions, diff reveal |
| Icons | **lucide-react** | Consistent stroke icons |
| Data fetching | **TanStack Query v5** + Firebase JS SDK v12 | |
| Forms/validation | **react-hook-form** + **Zod v4** | Zod schemas generated or mirrored from contracts |
| i18n | **next-intl** | `en`, `hi` |
| Charts | **Recharts** (premium strip, proof page) | Follow dataviz rules in 07 |
| PDF viewing | **react-pdf** (pdf.js) | Clause highlight overlays |
| Audio | Web Audio `AudioWorklet` | 16 kHz capture, 24 kHz playback |
| Package mgmt (JS) | **pnpm** workspaces + **Turborepo** | |
| Runtime (JS) | **Node.js 24 LTS** | App Hosting supports current LTS |
| API | **Python 3.13**, **FastAPI**, **Uvicorn**, **Pydantic v2** | |
| Agents | **Google ADK (Python)** `google-adk` | LlmAgent, tools, `run_live` streaming |
| Gemini SDK | **google-genai** (`vertexai=True`) | Structured output via `response_schema` |
| Firebase server | **firebase-admin** (Python) | Token verify, Firestore, Storage |
| Python tooling | **uv** (workspaces), **ruff**, **mypy** (strict on engine), **pytest**, **hypothesis** (property tests for engine) | |
| PDF rendering (letters) | **WeasyPrint** or **Typst** | Letter templates in `services/api/app/templates/` |
| PDF page images | **pypdfium2** | Page PNGs for clause highlighting |
| Testing (web) | **Vitest**, **Testing Library**, **Playwright** | |
| Observability | OpenTelemetry → Cloud Trace; structured JSON logs | ADK emits traces |

## 8. Repository structure

```
kavach/
├── README.md                     # What it is, live link, video, architecture diagram, how to run
├── LICENSE                       # Apache-2.0 (suggested)
├── docs/                         # This plan (copied in), ADRs, diagrams
│   └── plan/
├── apps/
│   └── web/                      # Next.js 16
│       ├── app/
│       │   ├── [locale]/(marketing)/page.tsx          # Landing
│       │   ├── [locale]/(marketing)/proof/page.tsx    # Accuracy proof
│       │   ├── [locale]/(auth)/sign-in/page.tsx
│       │   ├── [locale]/(app)/home/page.tsx           # Cover map
│       │   ├── [locale]/(app)/setup/...               # Onboarding steps
│       │   ├── [locale]/(app)/plan/page.tsx
│       │   ├── [locale]/(app)/policies/[policyId]/page.tsx
│       │   ├── [locale]/(app)/change/...              # Moment 1
│       │   ├── [locale]/(app)/desk/[sessionId]/page.tsx   # Moment 2
│       │   ├── [locale]/(app)/claims/[caseId]/page.tsx    # Moment 3
│       │   ├── [locale]/(app)/timeline/page.tsx
│       │   └── [locale]/(app)/settings/page.tsx
│       ├── components/  (ui/ = shadcn, kavach/ = product components)
│       ├── lib/ (firebase.ts, api.ts, audio/, live/, i18n/)
│       ├── messages/ (en.json, hi.json)
│       ├── styles/tokens.css
│       └── apphosting.yaml
├── services/
│   └── api/
│       ├── pyproject.toml
│       ├── Dockerfile
│       └── app/
│           ├── main.py            # FastAPI app; routers
│           ├── worker.py          # Cloud Tasks entrypoint
│           ├── auth.py
│           ├── routers/           # households, documents, life_changes, plans, actions, desk, claims, evals, demo
│           ├── commands/          # one module per command
│           ├── events/            # event types (from contracts) + store (append, read)
│           ├── projection/        # project(), apply()
│           ├── agents/            # ADK agents, tools, prompts/*.md
│           ├── live/              # WebSocket ↔ ADK run_live bridge
│           ├── ingest/            # pdf → pages → clauses → embeddings → terms
│           ├── retrieval/         # clause search (Firestore vector)
│           ├── templates/         # letter templates
│           └── settings.py        # model IDs, region, flags via env
├── packages/
│   ├── engine/                    # pure Python rules engine + tests
│   │   ├── kavach_engine/{needs,budget,optimise,cover_map,calendar,diff,hospital,claim,score,rules}.py
│   │   └── tests/                 # every worked example in 05 doc is a test
│   └── contracts/
│       ├── python/kavach_contracts/   # Pydantic models (source of truth)
│       ├── schema/                    # generated JSON Schema
│       └── ts/                        # generated TS types (@kavach/contracts)
├── data/
│   ├── rules/IN/                  # rules pack YAML (05 doc), with sources
│   ├── catalog/                   # illustrative cover categories + indicative premium tables
│   ├── personas/                  # sharma.json, meera.json, khan.json (event scripts)
│   ├── samples/                   # MARKED-SAMPLE benefit summary, estimate, letters (PDF/PNG)
│   └── wordings/                  # manifest of public policy wordings (URLs, UINs) — PDFs fetched by script
├── evals/
│   ├── labels/                    # hand-labelled answers per wording (YAML)
│   ├── run_eval.py
│   └── results/                   # published JSON + markdown report
├── infra/
│   ├── firebase.json  firestore.rules  firestore.indexes.json  storage.rules
│   ├── bootstrap.sh  deploy.sh
│   └── terraform/ (optional)
├── .github/workflows/{ci.yml,deploy.yml}
├── pnpm-workspace.yaml  turbo.json  package.json
└── pyproject.toml (uv workspace root)
```

## 9. Scalability and the path to a real business

- **Stateless API**, horizontal scaling on Cloud Run; Firestore scales automatically. Live sessions are per-instance WebSockets with session affinity; each instance handles tens of concurrent live sessions (bounded by CPU for audio relay).
- **Connectors** (AA via a licensed FIU partner, Bima Sugam, insurer APIs, eIA repositories) implement one interface: `Connector.pull(household, consent) -> list[Event]`. Each event carries `source="aa" | "insurer_api"`. Nothing else in the system changes. See [12-roadmap.md](12-roadmap.md).
- **Countries** are rules packs + product libraries + language packs. The engine reads `household.country` and loads `data/rules/{country}`.
- **B2B (employers):** a `tenant` field on households and an `employers` collection (GMC wording shared by all employees of a tenant). Already compatible with the product-library design (AD-6).
- **Analytics:** Firestore → BigQuery export; nothing personal leaves the project.
