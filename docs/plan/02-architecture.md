# 02 · System architecture

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**How Kavach is put together on Google Cloud, why each piece is there, and how a request flows through it for each moment and each door (app, live desk, WhatsApp).** Gemini specifics (models, agents, prompts, verification, evaluation) are in [03-gemini-and-agents.md](03-gemini-and-agents.md). Storage schemas are in [04-data-model.md](04-data-model.md). Endpoint contracts are in [06-api.md](06-api.md).

---

## 1. Constraints that shaped the design

| Constraint | Source | Consequence |
|---|---|---|
| Must use Gemini / Google agent tools | Hackathon rules | Gemini on Vertex AI for every model call through the official `@google/genai` SDK (including the Live API); Google ADK for TypeScript (`@google/adk`) for the non-live multi-step agents |
| Must deploy on Cloud Run or Firebase | Hackathon rules | API on **Cloud Run**; web on **Firebase App Hosting** (which itself runs on Cloud Run) |
| 40% of score is Gen AI depth | Judging | Multimodal ingest, live Hindi voice with tool calls fed by a high-accuracy estimate reader, Hindi voice notes on WhatsApp, multi-agent with tools, verifier, measured evaluation |
| Rupee numbers must be auditable | Principle P3 | A pure, deterministic **engine** package; LLMs call it as a tool, never compute ₹ themselves |
| Two people and parallel agents, ~48 hours | implementation-plan.md | Defer infrastructure judges never see: plain Firestore documents (no event sourcing), one API service, one web app, one language (TypeScript) everywhere, no separate contracts package |
| Must become a real business | Kshitij | Fact provenance, per-country rules packs, connector interface for AA/insurers; event sourcing is on the roadmap |
| Families already live on WhatsApp | red-team-response.md §2 | WhatsApp is a second door to the **same** agent and engine, through one webhook on the same Cloud Run service |
| Latest libraries, industry-standard structure | Kshitij | pnpm + Turborepo monorepo, shared Zod schemas, current stable versions (section 7) |

## 2. The system at a glance

```
                          ┌──────────────────────────────────────────────────────┐        ┌──────────────────────────┐
                          │                 Browser / phone (PWA)                │        │ WhatsApp                 │
                          │  Next.js app · mic (PCM 16 kHz) · camera (stills)    │        │ Meta Cloud API test no.  │
                          └───────┬───────────────┬──────────────────┬───────────┘        │ Twilio sandbox (judges)  │
                     HTTPS (SSR)  │     HTTPS JSON│        WebSocket │ (live desk,        └────────────┬─────────────┘
                                  ▼               ▼                  ▼  audio only)                    │ webhook
┌───────────────────────────┐   ┌────────────────────────────────────────────────────────────┐        │ (signed)
│ Firebase App Hosting      │   │ Cloud Run: kavach-api (TypeScript, Fastify 5)              │◄───────┘
│  apps/web (Next.js SSR)   │   │                                                            │
│  - pages, i18n, auth UI   │   │  REST /v1/...   WS /v1/live/{session}   /v1/whatsapp/...   │
│  - /api/og/card (PNG)     │   │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
└──────────┬────────────────┘   │  │ Routes +     │  │ Agents (03 doc)  │  │ Channels     │  │
           │ Firebase Auth      │  │ store module │  │ estimate reader, │  │ whatsapp/    │  │
           │ (ID tokens)        │  │ (plain docs) │  │ desk live, life- │  │ meta, twilio,│  │
           ▼                    │  │              │  │ event, claim,    │  │ media, tts   │  │
┌───────────────────────────┐   │  │              │  │ doc reader, ...  │  │              │  │
│ Firebase Auth             │◄──┤  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘  │
└───────────────────────────┘   │         │      ┌───────────▼─────────────────────▼──┐      │
                                │         │      │ core/answer.ts: one desk core for  │      │
                                │         │      │ live, text-and-photo and WhatsApp  │      │
                                │         ▼      └──────────────┬─────────────────────┘      │
                                │  ┌────────────────────────────▼───────────┐                │
                                │  │ @kavach/engine (pure TypeScript)       │                │
                                │  │ needs · budget · optimise · cover-map  │                │
                                │  │ calendar · diff · hospital · claim     │                │
                                │  │ say · rules (R-HL-*, R-CLM-*)          │                │
                                │  └────────────────────────────────────────┘                │
                                └──────┬──────────────┬───────────────┬──────────────────────┘
                                       │              │               │
                     ┌─────────────────▼───┐  ┌───────▼────────┐  ┌───▼───────────────────┐
                     │ Firestore (Native)  │  │ Cloud Storage  │  │ Vertex AI              │
                     │ households (plain   │  │ uploads, PDFs, │  │ Gemini Pro / Flash /   │
                     │ docs), plans, desk  │  │ page images,   │  │ Live / TTS, embeddings │
                     │ sessions, clauses   │  │ generated PDFs │  │                        │
                     │ + vectors           │  │                │  │                        │
                     └─────────────────────┘  └────────────────┘  └────────────────────────┘

   Background:  in-process jobs in kavach-api (status in Firestore) for document ingest; demo wordings pre-ingested by script
   Observability: Cloud Logging (structured JSON via Fastify's logger), Error Reporting
   Secrets: Secret Manager (Meta, Twilio, webhook verify token, demo admin key) · CI/CD: Cloud Build → Artifact Registry → Cloud Run; App Hosting for web
```

The `@kavach/engine` package is also imported by the web app, so the room comparison and the Why panel can recompute instantly in the browser. Numbers shown to users are still the ones the API returns.

### Key architectural decisions

| # | Decision | Why | Alternative rejected |
|---|---|---|---|
| AD-1 | **All reads and writes go through the API** (TanStack Query in the browser; desk cards arrive over the live WebSocket) | One place for validation and authz; Firestore security rules can simply deny all client access | Firestore listeners from the browser (more security rules to get right; the implementation plan allowed one listener for desk cards, which the WebSocket now covers) |
| AD-2 | **Plain Firestore documents for the household** (`households/{hid}` with members, policies and finances as fields; `plans`, `actions`, `deskSessions`, `claimCases`, `timeline` subcollections) | Event store + projector is about a day of work with no visible gain; a small `timeline` entry written alongside each change still drives the Timeline screen and the plan diff | Event-sourced household (moved to the roadmap) |
| AD-3 | **Deterministic engine as a separate pure package** (`@kavach/engine`) | Auditable ₹ numbers; reusable by agents, API, web and eval harness; can port to other countries via rules packs | Letting Gemini compute numbers (unverifiable) |
| AD-4 | **Live desk proxied through Cloud Run** (browser ↔ our Fastify WebSocket ↔ Gemini Live via `@google/genai` `ai.live.connect`) | The live agent must call our tools (engine, policy lookup) with server credentials and household data; keeps keys server-side; lets us log and verify. The tool-call loop is ~150 lines of our own code; ADK's TypeScript `runLive` is experimental | Browser connecting straight to Gemini Live (no server tools, keys exposed) |
| AD-5 | **Live session is audio-only; the estimate is read from a still by a separate Pro call** | Audio+video sessions are capped at ~2 minutes, audio-only at ~15; line-item amounts must be exact. "Capture" sends a still to the estimate reader and the structured result enters the session as a tool result. The camera preview stays on screen | Streaming camera frames to the live model (session cap, misread amounts) |
| AD-6 | **Product wordings are a shared library, parsed once** | A policy wording is the same for every buyer of a product (same UIN). Parse into clauses + terms once; every household's policy schedule links to it. Cheaper and makes the accuracy eval meaningful | Re-parsing each upload |
| AD-7 | **Clause retrieval with Firestore vector search** | One database; `findNearest` on clause embeddings is enough at this scale | Separate vector DB (more infra, no gain for a hackathon) |
| AD-8 | **One service, in-process jobs** | Demo documents are known in advance and pre-ingested by a script; uploads during judging run as an in-process job with status in Firestore | Separate worker service + Cloud Tasks |
| AD-9 | **One language, shared Zod schemas** (`packages/schemas`, Zod v4, imported by web, API and engine; `z.toJSONSchema()` gives Gemini its structured-output schemas) | Web and API never disagree on shapes; no code generation; parallel agents build against the schemas from the first hour | Pydantic → JSON Schema → generated TypeScript (two toolchains) |
| AD-10 | **One channel-agnostic desk core** `answer(household, patientId, inputs, locale) → DeskAnswer` used by the live desk, the text-and-photo desk and WhatsApp | WhatsApp costs only a channel adapter; nothing in `channels/` or `live/` computes a number or decides a rule | A separate WhatsApp bot with its own logic (doubles testing) |

## 3. Components

### 3.1 `apps/web`: Next.js web app (Firebase App Hosting)

- **Responsibilities:** all screens in [08-screens.md](08-screens.md); auth UI; i18n (English/Hindi); audio capture and playback; camera; PWA install; demo mode; the WhatsApp card image route.
- **Rendering:** App Router (`apps/web/src/app/[locale]/…`). Marketing and proof pages are server components (fast first paint for judges). App screens are client components.
- **Data access:**
  - Reads and writes: `fetch` to `kavach-api` with the Firebase ID token in `Authorization: Bearer`, wrapped in TanStack Query (`src/lib/api.ts`).
  - Uploads: multipart `POST` to the API (`@fastify/multipart`), which stores the file in Cloud Storage under `households/{hid}/uploads/{uploadId}/{filename}` and starts ingest.
- **Live desk:** a WebSocket to `wss://api.../v1/live/{sessionId}`. An `AudioWorklet` captures mic audio, downsamples to 16 kHz 16-bit PCM mono, sends 20–40 ms chunks. **No camera frames are streamed.** The camera preview is shown on screen; a "Capture estimate" button uploads a full-resolution still for the estimate reader. Playback of 24 kHz PCM via an `AudioWorklet` ring buffer; stop playback immediately on an `interrupted` message (barge-in).
- **Card images:** `app/api/og/card/[cardId]/route.tsx` renders the same answer-card design to PNG with Next.js `ImageResponse` (Noto Sans Devanagari loaded for Hindi), for WhatsApp replies.

### 3.2 `apps/api`: Kavach API (Cloud Run, TypeScript)

- **Fastify 5** on Node.js 24 with `fastify-type-provider-zod` (request and response validation from `packages/schemas`), `@fastify/websocket`, `@fastify/multipart`, `@fastify/rate-limit`. One plugin per area in `src/routes/` (health, demo, households, documents, life-changes, plans, actions, desk, claims, proof), registered in `src/server.ts`, all under `/v1`.
- **Auth** (`src/auth.ts`): verifies the Firebase ID token (`firebase-admin`), loads the caller's household access from `households/{hid}.accessUids`, rejects otherwise. `AUTH_DISABLED=1` for local runs only.
- **Store** (`src/store/`): one small interface (`get`, `set`, `update`, `list`, `delete`) with a Firestore implementation and an in-memory one (`STORE=memory` for local runs). Every route writes the household document(s) and, where it matters, a `timeline` entry.
- **Gemini** (`src/lib/gemini.ts`): `generateStructured()` is the one way to call a model for JSON; with `FAKE_LLM=1` it returns a recorded fixture from `apps/api/fixtures/`.
- **Agents** (`src/agents/`): estimate reader, desk live agent, life-event parser, claim reader, appeal drafter, document reader, verifier; prompts in `prompts/*.md` (03 doc).
- **Desk core** (`src/core/answer.ts`): the channel-agnostic `answer()` (AD-10).
- **Live gateway** (`src/live/`): WebSocket endpoint bridging the browser to a Gemini Live session (`ai.live.connect` on Vertex) and running the tool-call loop.
- **WhatsApp channel** (`src/channels/whatsapp/`): `webhook.ts` (one route, two adapters), `meta.ts`, `twilio.ts`, `media.ts` (download, `ffmpeg` OGG/Opus ↔ PCM), `tts.ts` (Gemini TTS for the Hindi voice note).
- **Letters** (`src/letters/`): `@react-pdf/renderer` templates for the HR migration letter and the insurer grievance letter.
- **Deployment:** Cloud Run service `kavach-api`, region `asia-south1` (Mumbai; Indian data residency story) unless the model check says otherwise. Min instances 1 (no cold start during judging), max 5, request timeout 3600 s (WebSockets), CPU always allocated (needed for live streaming), session affinity on. Image: Node 24 slim + `ffmpeg`.

> **Model region check (hour one):** confirm the chosen Gemini Pro, Flash, Live native-audio, TTS and embedding models are available in the chosen Vertex AI region. If not, keep Cloud Run in `asia-south1` and call Vertex AI in the nearest region that has them, the `global` endpoint, or the Gemini Developer API (still Google). Record the decision in the README.
>
> **Fallback if the hour-one live spike fails on Node:** only the live bridge moves to a small Python service (`services/desk-live`, ADK `run_live`) that calls the TypeScript API's evaluate endpoint for every number. Nothing else changes (implementation-plan.md §3.4).

### 3.3 Background jobs (in-process)

- No separate worker. Long work (document ingest: classify → extract → for wordings: segment clauses, embed, extract terms) runs as an in-process job in `kavach-api`, with its status written to the document's Firestore record so the UI can show progress.
- Wordings used in the demo and the evaluation are **pre-ingested** by `scripts/ingest-wordings.ts`.
- Jobs are idempotent by `documentId` + `stage`, so a retry after a restart is safe.

### 3.4 `packages/engine`: deterministic rules engine (`@kavach/engine`, pure TypeScript)

- No I/O, no network, no LLM. Inputs and outputs are Zod types from `packages/schemas`. Money is integer rupees with one explicit rounding rule (`money.ts`).
- Modules: `needs`, `budget`, `optimise`, `cover-map`, `calendar`, `diff`, `hospital`, `claim`, `score`, `say`, `rules`.
- Every rule has an ID (e.g. `R-HL-001`) and returns a trace (`RuleFiring[]`) explaining which rules fired with which inputs. The trace is what the UI's "Why" panel and the agents use to explain.
- `say` formats amounts the Indian way (₹1,50,800) and in Hindi words for speech, and builds the spoken line, so no agent ever composes a number.
- Rules live in `packages/engine/src/rules.ts` with a human-readable copy in `data/rules/IN/README.md`. `data/rules/SG/` later. See [05-rules-engine.md](05-rules-engine.md).

### 3.5 `packages/schemas`: shared types

- Source of truth: **Zod v4** schemas in `packages/schemas/src/` (`common`, `household`, `hospital`, `desk`, `claim`, `action`, `demo`), imported directly by the web app, the API and the engine. No build step, no generated code.
- Gemini structured-output schemas come from the same Zod schemas via `z.toJSONSchema()`, so extraction output parses straight into domain types.
- Changes are additive during the build (new fields, schemas, enum values); nothing is renamed or removed.

### 3.6 Data stores

| Store | Holds | Notes |
|---|---|---|
| **Firestore (Native mode)** | Users, households (plain documents), timeline entries, plans, actions, documents metadata, product library, clauses (+ embeddings), desk sessions, claim cases, WhatsApp senders and message log, live-minutes counter, eval runs | Accessed only by the API (Admin SDK); vector index on clause embeddings |
| **Cloud Storage** bucket `kavach-<env>-docs` | Uploaded files, rendered page images (for clause highlight), generated letters (PDF), card PNGs and voice notes sent on WhatsApp | Uniform bucket-level access; WhatsApp media deleted after processing; demo uploads deleted after 30 days; Twilio gets media through short-lived signed URLs |
| **Secret Manager** | Meta WhatsApp token, Meta app secret, webhook verify token, Twilio auth token, demo admin key | Service account access only; never in `.env` in git |
| **BigQuery** (later) | Firestore export for analytics, eval history | Not needed for hackathon |

### 3.7 Google AI services

Detailed in [03-gemini-and-agents.md](03-gemini-and-agents.md). In short:

| Use | Service |
|---|---|
| Reasoning, extraction, verification | Gemini Pro-class model on Vertex AI (latest 3.x) |
| High-volume / low-latency (intake parse, question wording, classification, voice-note understanding, translation) | Gemini Flash-class model (latest 3.x) |
| Live voice at the desk (audio only) | Gemini Live API native-audio model on Vertex AI via `@google/genai` `ai.live.connect` |
| Hindi voice-note replies on WhatsApp | Gemini text-to-speech model |
| Clause embeddings | Gemini embedding model on Vertex AI (768-dim output) |
| Agent orchestration | Google ADK for TypeScript (`@google/adk`) for the non-live multi-step agents (life change, claim); our own tool loop for the live desk |
| SDK | `@google/genai` (unified Gen AI SDK) with `vertexai: true` |

## 4. Request flows

### 4.1 Setup: sentence → household

```
User                 Web                     API                         Gemini            Engine     Firestore
 │ "I'm Rahul, 34..."  │                        │                            │                 │           │
 │────────────────────►│ POST /v1/households     │                            │                 │           │
 │                     │───────────────────────►│ create households/{hid}     │──────────────────────────► │
 │                     │ POST /intake {text}     │                            │                 │           │
 │                     │───────────────────────►│ IntakeAgent ──────────────►│ structured      │           │
 │                     │                        │◄───────────────────────────│ MembersDraft    │           │
 │                     │◄── draft (not saved) ──│                            │                 │           │
 │ edits family card   │                        │                            │                 │           │
 │────────────────────►│ PUT /members ─────────►│ members on the household doc (source=said) + timeline ─►│
 │ sets 4 money facts  │ PUT /finances ────────►│ finances field + timeline entry                ──────────►│
 │ uploads 3 docs      │ POST /documents (multipart) ─► Storage + in-process ingest job                      │
 │                     │                        │ DocumentAgent ────────────►│ extraction      │           │
 │                     │                        │ policies (with citations) + inferred facts    ──────────►  │
 │                     │                        │ QuestionPlanner ──────────────────────────► │ ₹ impact │  │
 │◄── chips (≤3) ──────│◄── questions ─────────│                            │                 │           │
 │ taps answers        │ POST /answers ────────►│ fact (source=said) → plan recompute ──────►│ plan ────►│
 │◄── cover map refetched (TanStack Query) ──────────────────────────────────────────────────────────────── │
```

### 4.2 Moment 1: life change

1. `POST /v1/households/{hid}/life-changes:parse {text}` → `LifeEventAgent` returns a `ChangeSetDraft` (typed changes + effective date + confidence + clarifying question if needed). Nothing saved.
2. UI shows the parse ("Rahul: employer changes from Acme to a startup on 1 Dec 2026. Acme group health cover ends 30 Nov 2026."). User confirms.
3. `POST /v1/households/{hid}/life-changes {changeSet}` → updates the household document (employment, policy end dates), writes a timeline entry, runs the engine's plan as of the effective date, stores `plans/{n+1}` with a `diff` against `plans/{n}`, generates `Action` drafts (letters filled from the household), returns plan + actions.
4. UI refetches: cover map scrubs to 1 Dec, parents' health cells turn red, diff sheet opens, checklist appears.
5. User approves an action → `POST /v1/actions/{aid}:approve` → letter PDF rendered; reminder added to the timeline and scheduled as a dated WhatsApp nudge to the owner ("15 Nov: ask Acme HR to migrate Mummy and Papa's cover… reply YES"), plus an optional `.ics` download.

### 4.3 Moment 2: hospital desk (live)

```
Kamala's phone            kavach-api (Cloud Run)                     Vertex AI
     │ tap "At the hospital"     │                                           │
     │ POST /desk/sessions {patient: Suresh} ─► create deskSessions doc, load│
     │                           │ context pack (policies, terms, conditions,│
     │                           │ claims this year) ──────────────────┐     │
     │◄── {sessionId, wsUrl} ────│                                     │     │
     │ WS connect (ID token)     │ ai.live.connect(model, config:      │     │
     │══════════════════════════►│   audio out, input+output           │     │
     │                           │   transcription, Hindi voice,       │     │
     │                           │   resumption, compression) ═════════╪════►│ Gemini Live (audio only)
     │ PCM audio chunks ════════►│ session.sendRealtimeInput(audio) ═══╪════►│
     │ "Papa ki angioplasty Monday ko hai..."                          │     │
     │                           │◄═══════ audio + transcript ═════════╪═════│ "Estimate ki photo dikhaiye"
     │◄══ audio, captions ═══════│                                     │     │
     │ [Capture estimate] still ►│ EstimateReader (Pro, structured) ───┼────►│ generateContent
     │                           │◄── HospitalEstimate (room-category ─┼─────│
     │                           │    tariff, pricedByRoom, billingType)     │
     │                           │ tool call evaluate_options → answer()     │
     │                           │   → engine.hospital.evaluate → DeskEvaluation + trace (R-HL-*)
     │                           │   → say line + cards (engine trace ✓)    │
     │                           │ sendToolResponse({say, cards, question}) ═►│
     │◄══ audio: "Pehle parents wali policy ka card TPA desk par dijiye. ₹9,000 wale room mein…"
     │◄── WS JSON: answer cards, why-panel items ─────────────────────────────│
     │                           │ household alert to Rahul (WhatsApp template / in-app)
```

- The live model is told **to speak the tool's `say` string verbatim for any rupee amount** and never to state a figure that is not in a tool result. Cards render instantly with the ✓ from the engine trace; transcript matching runs offline for the Proof page, not on the live path (see 03 §6).
- When the estimate doesn't show whether the hospital bills by room category, `answer()` returns both branches and one `questionForDesk` (R-HL-010); for a package rate it asks for the package price in the room within the limit (R-HL-014).
- If the WebSocket fails or the live model is unavailable, the same flow runs as **text + photo** through `POST /desk/sessions/{id}/turns`, which calls the same `answer()` (FR-D-11). A daily live-minutes ceiling in Firestore also flips the desk to text mode.

### 4.4 Moment 2 on WhatsApp (the second door)

```
Kamala (WhatsApp)        Meta / Twilio          kavach-api /v1/whatsapp/{provider}           Vertex AI
  │ voice note + photo ───►│ webhook POST ─────►│ verify signature; sender → member;       │
  │                        │                    │ consent on first message                  │
  │                        │                    │ media.ts: download; OGG/Opus → PCM        │
  │                        │                    │ voice note → text (audio understanding) ──►│ Flash
  │                        │                    │ photo → EstimateReader ───────────────────►│ Pro
  │                        │                    │ answer() → engine (same as the app)        │
  │                        │                    │ tts.ts: say → PCM ─────────────────────────►│ TTS
  │                        │                    │ ffmpeg PCM → OGG/Opus; card PNG from web   │
  │◄── text + Hindi voice note + card + link ───│ send; delete media                         │
  │                        │                    │ household alert to Rahul ──► template (Meta) or free-form inside his 24 h window, else in-app
```

- **Meta** (video): `GET` verify with the verify token, `POST` receive with `X-Hub-Signature-256` check, media download and upload-and-send. **Twilio** (judges): request signature check, `MediaUrl` download, outbound media through a signed Cloud Storage URL. Both hit the same webhook code.
- **Proactive messages** (household alert, dated reminder) need their own path: Meta utility templates `household_alert` and `dated_reminder`; in the Twilio sandbox (no custom templates) only to numbers inside their own 24-hour window. The sender checks the recipient's last inbound time and picks template, free-form or in-app only; it never sends free-form outside a window.
- **Claim letter forwarding** runs the claim flow (4.5) and replies with the verdict and the appeal PDF.
- Off-topic messages get a polite insurance-only reply. Per-sender rate limit.

### 4.5 Moment 3: claim appeal

1. Upload letter (app or WhatsApp) → `ClaimLetterAgent` extracts `SettlementLetter` (claim no., billed, approved, deductions[]).
2. A `claimCases` document links it to the desk session/admission and to the policy.
3. `engine.claim.assess(letter, bill, terms)` classifies each deduction with rule IDs; the claim agent retrieves clauses for each and writes reasons; the verifier checks.
4. `AppealDrafter` writes the grievance letter (English, optional Hindi copy) from a template + verified findings. Action draft created.
5. User edits/approves → PDF rendered → user downloads or opens their email client with prefilled `mailto:` (Kavach never sends to the insurer).

## 5. Security architecture

| Layer | Control |
|---|---|
| Identity | Firebase Auth (Google sign-in, phone OTP later). Demo mode uses an anonymous Firebase user scoped to a cloned demo household |
| API authz | ID token verified on every call; role from `households/{hid}.access[uid]`; owner-only for destructive commands (delete, invite) |
| Firestore rules | Clients have **no** direct access: all reads and writes go through the API with the Admin SDK (`infra/firestore.rules` denies everything). The API checks `request uid in households/{hid}.accessUids` |
| Uploads | Through the API only (multipart), max 15 MB, content type PDF/JPEG/PNG/HEIC; stored under `households/{hid}/uploads/**`; outbound WhatsApp media through short-lived signed URLs |
| WhatsApp | Meta `X-Hub-Signature-256` and Twilio request signatures verified on every webhook call; sender number mapped to a household member; first-message consent; media deleted after processing; per-sender rate limit |
| Service accounts | `kavach-api-sa`: Firestore user, Storage object admin on the bucket, Vertex AI user, Secret Manager secret accessor |
| Secrets | None in code or in git; Meta token, Meta app secret, webhook verify token, Twilio auth token and demo admin key in Secret Manager; local runs read placeholders from a git-ignored `.env`; GitHub secret scanning on before the repo goes public |
| Data | Google-managed encryption at rest; TLS in transit; PII and health data never written to logs (structured logger with a redaction filter); prompts/responses logged only as IDs and token counts in production |
| Model safety | Vertex AI safety settings at defaults plus our own guardrails (03 §8); no model output is executed |
| Abuse | Per-IP, per-household and per-WhatsApp-number rate limits (`@fastify/rate-limit`); 5-minute cap per live session and a daily live-minutes ceiling that switches the desk to text mode; upload size limits; GCP budget alert; App Check on web (reCAPTCHA Enterprise) — S priority |

DPDP/IRDAI aspects are in [11-trust-safety-compliance.md](11-trust-safety-compliance.md).

## 6. Environments and deployment

| Env | Project ID (suggested) | Purpose |
|---|---|---|
| `dev` | `kavach-dev-<suffix>` | Builders' shared environment; emulators locally |
| `prod` | `kavach-prod-<suffix>` | The judged live link; demo data seeded |

- **Local:** `pnpm dev` runs the web app (`next dev`) and the API (`tsx watch`). The defaults need no keys: `FAKE_LLM=1` returns recorded fixtures from `apps/api/fixtures/`, `STORE=memory` keeps data in the API process, `AUTH_DISABLED=1` skips sign-in, and an empty `GCS_BUCKET` writes files to `.data/blobs/`. Fill in the keys in `.env` to switch each to the real service; Meta and Twilio keys stay placeholders until provided.
- **CI:** on PR: ESLint, `tsc` across the workspace, web build, and the demo path run with fixtures. On merge to `main`: Cloud Build → Artifact Registry → Cloud Run `kavach-api`; App Hosting deploys `apps/web` from `main`.
- **Config:** `apps/web/apphosting.yaml` (env vars, min instances 1); `gcloud run deploy` flags in `infra/deploy-api.sh` and `infra/cloudbuild-api.yaml`.
- **Infra as code:** `infra/` contains `firestore.rules`, `firestore.indexes.json`, `bootstrap.sh` (enables `run`, `aiplatform`, `firestore`, `storage`, `secretmanager`, `artifactregistry`, `cloudbuild`, `firebase`, `firebaseapphosting`; creates Firestore, the bucket, the image repository and empty secrets) and the deploy scripts; `firebase.json` at the repo root.

## 7. Technology choices (latest stable; pin exact versions on build day)

| Area | Choice | Notes |
|---|---|---|
| Web framework | **Next.js 16** (App Router), **React 19.2**, **TypeScript 5.9+** | Server components for marketing/proof; client for app |
| Styling | **Tailwind CSS v4**, **shadcn/ui** (Radix primitives), CSS variables for tokens (07 doc) | Tokens map 1:1 to the design system |
| Motion | **Motion** (formerly Framer Motion) | Cover-map transitions, diff reveal |
| Icons | **lucide-react** | Consistent stroke icons |
| Data fetching | **TanStack Query v5** + Firebase JS SDK v12 | |
| Forms/validation | **react-hook-form** + **Zod v4** | Same Zod schemas as the API, from `packages/schemas` |
| i18n | **next-intl** | `en`, `hi` |
| Charts | **Recharts** (premium strip, proof page) | Follow dataviz rules in 07 |
| PDF viewing | **react-pdf** (pdf.js) | Clause highlight overlays |
| Audio | Web Audio `AudioWorklet` (browser); **ffmpeg** in the API image | 16 kHz capture, 24 kHz playback; WhatsApp OGG/Opus ↔ PCM |
| Card images | Next.js `ImageResponse` (`next/og`) | Answer cards as PNG for WhatsApp, Noto Sans Devanagari |
| Package mgmt (JS) | **pnpm** workspaces + **Turborepo** | |
| Runtime (JS) | **Node.js 24 LTS** | App Hosting supports current LTS |
| API | **Node.js 24 LTS**, **Fastify 5**, `fastify-type-provider-zod`, `@fastify/websocket`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/cors` | One language across web, API and engine |
| Shared types | **Zod v4** in `packages/schemas` | `z.toJSONSchema()` for Gemini structured output |
| Engine | `@kavach/engine`, pure TypeScript, `strict` | Integer rupees; imported by API and web |
| Gemini SDK | **`@google/genai`** (`vertexai: true`) | Structured output via `responseJsonSchema`; Live API via `ai.live.connect` |
| Agents | **Google ADK for TypeScript** (`@google/adk`) | Only for the non-live multi-step agents (`runAsync`); the live desk uses `@google/genai` directly |
| Firebase server | **firebase-admin** | Token verify, Firestore, Storage |
| WhatsApp | Meta WhatsApp Cloud API (plain HTTPS), **`twilio`** SDK | One webhook, two adapters |
| PDF rendering (letters) | **`@react-pdf/renderer`** | Letter templates in `apps/api/src/letters/`, Noto fonts |
| Tooling | **tsx** (scripts and dev), **tsup** (API build), **ESLint**, **Prettier** | |
| Checks | Run the flows for real (API + web started, endpoints called, pages loaded); Playwright for the demo path; engine worked examples run by a script | No unit-test suite during the hackathon |
| Observability | Fastify's pino logger → structured JSON in Cloud Logging; Error Reporting | |

## 8. Repository structure

The layout on `main` (see the root README); folders marked *(planned)* arrive with their work package.

```
kavach/
├── README.md                     # What it is, live link, video, QR, architecture, how to run, model IDs, honest notes
├── PROGRESS.md                   # Build status per feature branch
├── docs/                         # plan/, research/, implementation-plan.md
├── apps/
│   ├── web/                      # Next.js 16 → Firebase App Hosting
│   │   ├── src/app/[locale]/                 # page.tsx (landing), demo/, (app)/{home,setup,change,actions,desk,claims,policies,timeline,settings}/, proof/
│   │   ├── src/app/api/og/card/[cardId]/route.tsx   # WhatsApp card PNG (planned)
│   │   ├── src/app/globals.css               # design tokens (07 doc)
│   │   ├── src/components/  (ui/ = shadcn, kavach/ = product components)
│   │   ├── src/lib/ (api.ts, firebase.ts, household.ts, session.ts, audio/, live/)
│   │   ├── src/i18n/
│   │   ├── messages/{en,hi}/<feature>.json
│   │   └── apphosting.yaml
│   └── api/                      # Fastify 5 → Cloud Run
│       ├── Dockerfile            # Node 24 slim + ffmpeg
│       ├── fixtures/             # recorded model outputs for FAKE_LLM=1
│       └── src/
│           ├── index.ts  server.ts  env.ts  auth.ts  paths.ts
│           ├── store/            # Store interface: firestore.ts, memory.ts
│           ├── lib/              # gemini.ts (generateStructured), firebase.ts, blobs.ts
│           ├── routes/           # health, demo, households, documents, life-changes, plans, actions, desk, claims, proof
│           ├── demo/             # Sharma household loader and checkpoints
│           ├── core/answer.ts    # channel-agnostic desk core (planned)
│           ├── agents/           # estimate-reader, desk-live, life-event, claim-reader, appeal-drafter, doc-reader, verifier; prompts/*.md (planned)
│           ├── live/             # browser WebSocket ↔ Gemini Live bridge (planned)
│           ├── channels/whatsapp/  # webhook.ts, meta.ts, twilio.ts, media.ts, tts.ts (planned)
│           └── letters/          # react-pdf templates (planned)
├── packages/
│   ├── schemas/                  # Zod v4 schemas shared by web, API and engine (the contracts)
│   │   └── src/{common,household,hospital,desk,claim,action,demo,index}.ts
│   └── engine/                   # @kavach/engine, pure TypeScript
│       └── src/{money,hospital,claim,say,rules,cover-map,needs,budget,optimise,diff,score,calendar,examples,index}.ts
├── data/
│   ├── rules/IN/                 # human-readable rules pack (05 doc), with sources
│   ├── catalog/                  # illustrative cover categories + indicative premium tables
│   ├── personas/                 # sharma.json (checkpoints setup → job_change → hospital → claim)
│   ├── samples/                  # SAMPLE estimate (room-category tariff), settlement letter, benefits summary, schedules
│   └── wordings/                 # manifest of public policy wordings (URLs, UINs) — PDFs fetched by script
├── evals/
│   ├── labels/                   # labelled answers per wording (8 wordings)
│   ├── run-eval.ts
│   └── results/                  # published JSON + markdown report
├── infra/                        # firestore.rules, firestore.indexes.json, bootstrap.sh, deploy-api.sh, cloudbuild-api.yaml
├── scripts/                      # samples/ (renders data/samples), seed-demo.ts, ingest-wordings.ts, fetch-wordings.ts
├── firebase.json
└── pnpm-workspace.yaml  turbo.json  package.json  tsconfig.base.json
```

## 9. Scalability and the path to a real business

- **Stateless API**, horizontal scaling on Cloud Run; Firestore scales automatically. Live sessions are per-instance WebSockets with session affinity; each instance handles tens of concurrent live sessions (bounded by CPU for audio relay).
- **Connectors** (AA via a licensed FIU partner, Bima Sugam, insurer APIs, eIA repositories) implement one interface: `Connector.pull(household, consent) → FactUpdate[]`. Each fact carries `source: "aa" | "insurer_api"`. Nothing else in the system changes. When connectors arrive, the household moves to an event-sourced store (append-only events + projection), which the plain documents and the timeline entries are shaped to make easy. See [12-roadmap.md](12-roadmap.md).
- **Channels:** WhatsApp is the second door; any further channel (SMS, IVR) is another adapter on the same `answer()` core.
- **Countries** are rules packs + product libraries + language packs. The engine reads `household.country` and loads `data/rules/{country}`.
- **B2B (employers):** a `tenant` field on households and an `employers` collection (GMC wording shared by all employees of a tenant). Already compatible with the product-library design (AD-6).
- **Analytics:** Firestore → BigQuery export; nothing personal leaves the project.
