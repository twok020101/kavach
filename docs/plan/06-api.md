# 06 · API specification

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**Every endpoint the web app and WhatsApp call on `kavach-api`, with request and response shapes and the documents each call writes.** Types refer to [04-data-model.md](04-data-model.md) and the Zod schemas in `packages/schemas`. The API is Fastify 5 (TypeScript) with `fastify-type-provider-zod`: every route declares its params, body and response with the same Zod schemas the web app imports, so requests and responses are validated on both sides.

---

## 1. Conventions

- Base URL: `https://api.<domain>` (the Cloud Run URL in the hackathon; `http://localhost:8080` locally). Every path below already includes its version prefix (`/v1/...`), so clients join base URL + path as written; there is no `/v1` in the base URL.
- Routes: one Fastify plugin per area in `apps/api/src/routes/`, registered in `server.ts`. A literal `:` in a path (e.g. `demo:reset`) is written `::` in Fastify.
- Auth: `Authorization: Bearer <Firebase ID token>` on every call except `/health`, `GET /v1/public/proof` and the WhatsApp webhooks (which verify the provider's signature instead). Demo users get their token from Firebase anonymous sign-in (see `POST /v1/public/demo`). `AUTH_DISABLED=1` skips this for local runs only.
- JSON, camelCase. Money in integer rupees (`Rupees`). Dates `YYYY-MM-DD`.
- Idempotency: write calls accept an `Idempotency-Key` header (UUID); repeats within 24 h return the original result. WhatsApp webhooks are idempotent by the provider's message id.
- Errors: `{"error": {"code": "string", "message": "human readable", "details": {...}}}`. Codes: `unauthenticated`, `forbidden`, `not_found`, `validation_failed`, `model_unavailable`, `document_unreadable`, `rate_limited`, `live_ceiling_reached`, `internal`.
- Long-running work returns `202` with a resource whose `status` the client polls (TanStack Query `refetchInterval`); the browser does not read Firestore directly.
- Rate limits (`@fastify/rate-limit`): 120 req/min per IP overall; 30 model-backed req/min per household; per-WhatsApp-number limits on the webhook.

## 2. Endpoints

### Health and public

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness (`{"ok":true,"version":"…","models":{…}}`) |
| GET | `/v1/public/proof` | Latest eval summary for the Proof page |
| POST | `/v1/public/demo?checkpoint=hospital` | **Requires an ID token from Firebase anonymous auth.** Client flow: `signInAnonymously()` → get ID token → call this endpoint with `Authorization: Bearer`. The server verifies the token, clones the Sharma household (`data/personas/sharma.json`) at the checkpoint (default `hospital`) with that anonymous uid in `accessUids`, and returns `{householdId}`. If the user later signs in with Google, link the anonymous account (`linkWithPopup`) so the uid and household are kept |

### Households and setup

| Method | Path | Body | Returns | Writes |
|---|---|---|---|---|
| GET | `/v1/households/{hid}` | – | `Household` | – |
| POST | `/v1/households` | `{name?, city, country:"IN"}` | `{householdId}` | `households/{hid}`; timeline `setup` |
| POST | `/v1/households/{hid}/intake:parse` | `{text?, audioUploadId?, locale}` | `MembersDraft` (not saved) | – |
| PUT | `/v1/households/{hid}/members` | `{members: Member[]}` | `Household` | `members`; plan recompute |
| PATCH | `/v1/households/{hid}/members/{memberId}` | `{changes}` (incl. `phone`, `language`) | `Member` | member fields |
| PUT | `/v1/households/{hid}/finances` | `{takeHomeMonthly, emiMonthly, fixedSpendMonthly, emergencyFund}` | `{planId}` | `finances`; plan recompute |
| GET | `/v1/households/{hid}/questions` | – | `Question[]` (≤3) | – |
| POST | `/v1/households/{hid}/answers` | `{questionId, answer}` | `{planId}` | the answered field (source `said`); plan recompute |
| POST | `/v1/households/{hid}/assumptions` | `{path, value}` | `{planId}` | the field (source `said`); plan recompute |
| GET | `/v1/households/{hid}/timeline` | – | `TimelineEntry[]` | – |
| GET | `/v1/households/{hid}/export` | – | ZIP | – |
| DELETE | `/v1/households/{hid}` | `{confirm: "<household name>"}` | `202` | deletion job |

### Documents

| Method | Path | Body | Returns | Writes |
|---|---|---|---|---|
| POST | `/v1/households/{hid}/documents` | multipart file + `hint?: DocKind` | `202 {documentId}` | file to Storage; `documents/{docId}`; in-process ingest job; timeline `document_added` |
| GET | `/v1/households/{hid}/documents/{docId}` | – | `Document` (with `status`, `progress`) | – |
| POST | `/v1/households/{hid}/documents/{docId}:confirm` | `{acceptedPolicyIds[], edits?}` | `Household` | policies added or merged, with citations; plan recompute |
| GET | `/v1/products/{productId}/clauses/{clauseId}` | – | `Clause` + page image URL (signed) | – |
| POST | `/v1/products/{productId}/clauses:search` | `{query, categories?}` | `Clause[]` | – |

### Plans

| Method | Path | Returns |
|---|---|---|
| GET | `/v1/households/{hid}/plans/current` | `Plan` |
| POST | `/v1/households/{hid}/plans:preview` | body `{asOf}` → `Plan` (status preview; cover map as of that date) |
| GET | `/v1/households/{hid}/plans/{planId}/diff?against={planId}` | `PlanDiff` |
| POST | `/v1/households/{hid}/plans/{planId}/explain` | body `{question, locale}` → `Explanation` (AdvisorAgent, cited) |

### Moment 1: life changes and actions

| Method | Path | Body | Returns | Writes |
|---|---|---|---|---|
| POST | `/v1/households/{hid}/life-changes:parse` | `{text, locale}` | `ChangeSetDraft` | – |
| POST | `/v1/households/{hid}/life-changes` | `{changeSet}` | `{planId, previousPlanId, diff, actionIds[]}` | policy end dates / new policies; `plans/{n+1}` with diff; `actions/*` drafts; timeline `life_change` |
| GET | `/v1/households/{hid}/actions?status=draft` | – | `Action[]` | – |
| PATCH | `/v1/households/{hid}/actions/{aid}` | `{content}` (user edits) | `Action` | `actions/{aid}` |
| POST | `/v1/households/{hid}/actions/{aid}:approve` | – | `{action, pdfUrl?, icsUrl?}` | status `approved`, PDF; a `reminder` with a `dueDate` schedules the dated WhatsApp nudge; timeline `action_approved` |
| POST | `/v1/households/{hid}/actions/{aid}:complete` | `{note?}` | `Action` | status `done` (+ policy added if relevant) |
| POST | `/v1/households/{hid}/actions/{aid}:dismiss` | `{reason}` | `Action` | status `dismissed` |
| POST | `/v1/households/{hid}/recommendations/{rid}:handoff` | – | `{partnerCard}` (illustrative) | – |

### Moment 2: hospital desk

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/households/{hid}/desk/sessions` | `{patientMemberId, language, hospitalName?}` | `{sessionId, wsUrl, mode: "live"\|"text", contextSummary}` (`mode` is `text` when the daily live-minutes ceiling is reached) |
| WS | `/v1/live/{sessionId}?token=…` | see §3 | streaming (audio only) |
| POST | `/v1/households/{hid}/desk/sessions/{sid}/captures` | multipart image (the estimate still) | `{estimate: HospitalEstimate}` (also made available to the live session's `read_estimate`) |
| POST | `/v1/households/{hid}/desk/sessions/{sid}/turns` | `{text, locale, billingTypeAnswer?}` (text-and-photo desk) | `DeskAnswer` |
| POST | `/v1/households/{hid}/desk/sessions/{sid}:evaluate` | `{roomOptions?, billingTypeAnswer?}` | `DeskAnswer` (calls `answer()` directly; used by the UI "compare rooms" control and the billing-branch toggle) |
| POST | `/v1/households/{hid}/desk/sessions/{sid}:end` | – | `{summary}`; session `ended`; timeline `desk_session`; household alert to the owner |

Every desk route, the live session's `evaluate_options` tool and the WhatsApp webhook call the same `answer(household, patientId, inputs, locale)` in `apps/api/src/core/answer.ts`.

### WhatsApp (second door)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/whatsapp/meta` | Meta webhook verification: echoes `hub.challenge` when `hub.verify_token` matches `META_WEBHOOK_VERIFY_TOKEN` |
| POST | `/v1/whatsapp/meta` | Meta inbound messages and statuses. Checks `X-Hub-Signature-256` (HMAC-SHA256 with `META_APP_SECRET`); returns `200` at once and processes in the background |
| POST | `/v1/whatsapp/twilio` | Twilio sandbox inbound. Checks `X-Twilio-Signature` with `TWILIO_AUTH_TOKEN`; `MediaUrl0..n` downloaded with basic auth |

Processing for each inbound message (both providers, one code path in `apps/api/src/channels/whatsapp/webhook.ts`):

1. Look up `whatsappSenders/{e164}`; unknown number → short reply asking the family to add this number (or, for judges, the sandbox join flow links it to their demo household). Record `lastInboundAt`.
2. No consent yet → send the consent text and stop; "HAAN"/"YES" sets `consent.grantedAt` and `whatsappConsentAt` on the member. "STOP" withdraws it.
3. Rate-limit per sender.
4. Media: download (Meta: media id → URL → bytes with the token; Twilio: `MediaUrl`), keep in memory only. Voice note (OGG/Opus) → Gemini audio understanding → text. Photo → document type → `EstimateReader` or `ClaimLetterReader`.
5. Desk: open or continue a `deskSessions` document with `channel: "whatsapp"` → `answer()`. Claim letter: open a `claimCases` document → `claim.assess` → appeal draft.
6. Reply: `answer().text`; a voice note of `answer().say` (Gemini TTS → PCM → `ffmpeg` OGG/Opus); the card PNG from `GET {web}/api/og/card/{cardId}`; a link to the full card in the app. For a claim, the verdict text and the appeal letter PDF.
7. Household alert to the owner (below). Delete the media.

Outbound sending (`meta.ts`, `twilio.ts`) is one function, `send(to, message)`, that checks the recipient's `lastInboundAt`:

| Recipient state | Meta (video) | Twilio sandbox (judges) |
|---|---|---|
| Inside their 24-hour window | free-form text, audio, image, document | free-form |
| Outside the window | approved utility template: `household_alert` (variables: hospital, room) or `dated_reminder` (variables: date, action) | not sent; the alert shows in the app instead |
| Opted out | not sent | not sent |

It never sends free-form outside a window. Off-topic messages get a polite insurance-only reply.

| Message | Template / text |
|---|---|
| Household alert (to Rahul) | "Mummy is at City Heart Hospital. Kavach told her to ask for the ₹5,000 room. Tap to see." + link |
| Dated reminder (to Rahul) | "15 Nov: ask Acme HR to migrate Mummy and Papa's cover. The letter is ready, reply YES to send it to you as a PDF." |

Amounts in these messages come from the engine via `answer()` or the action; the templates carry them as variables.

### Moment 3: claims

| Method | Path | Body | Returns | Writes |
|---|---|---|---|---|
| POST | `/v1/households/{hid}/claims` | `{letterDocumentId, policyId?, deskSessionId?}` | `202 {caseId}` | `claimCases/{cid}` (status `reading` → `assessed`); timeline `claim_case` |
| GET | `/v1/households/{hid}/claims/{caseId}` | – | `ClaimCase` | – |
| POST | `/v1/households/{hid}/claims/{caseId}:draft-appeal` | `{locale}` | `{actionId}` | `actions/{aid}` (`grievance_letter`) |
| POST | `/v1/households/{hid}/claims/{caseId}:status` | `{stage, sentAt?, outcome?}` | `ClaimCase` | status; `claimsUsedThisYear` on the policy when resolved |

### Family access

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/households/{hid}/invites` | `{memberId, language}` | `{inviteUrl, qrPngUrl}` |
| POST | `/v1/invites/{token}:accept` | – | `{householdId}` (uid added to `accessUids`) |

### Evals (admin)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/admin/evals` | Start eval run (admin key) |
| GET | `/v1/admin/evals/{runId}` | Run detail |

### Demo controls (demo households only)

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/v1/households/{hid}/demo:clock` | `{date}` | Set the demo clock (e.g. jump to 2027-02-08); returns `Household` |
| POST | `/v1/households/{hid}/demo:reset` | `{persona:"sharma", checkpoint:"setup"\|"job_change"\|"hospital"\|"claim"}` | Reset the household to a checkpoint from `data/personas/sharma.json`; returns `Household` |

## 3. Live WebSocket protocol (`/v1/live/{sessionId}`)

Audio only: the camera preview stays on the phone and the estimate goes through the captures endpoint (or a `capture` message), never as video frames.

Client → server messages:
```json
{"type":"hello","token":"<ID token>","language":"hi","sampleRate":16000}
{"type":"audio","data":"<base64 PCM16 LE mono 16kHz, 20-40ms>"}
{"type":"audioEnd"}                                  // mic muted
{"type":"capture","uploadId":"…"}                    // a still uploaded via /captures; the server runs the estimate reader
{"type":"text","text":"Room kitna hai?"}
{"type":"billingAnswer","billingType":"differential"} // the desk's answer to the R-HL-010 question, from a button
{"type":"setLanguage","language":"en"}
{"type":"end"}
```

Server → client messages:
```json
{"type":"ready","sessionId":"dsk_...","resumable":true}
{"type":"audio","data":"<base64 PCM16 24kHz>"}
{"type":"caption","role":"user","text":"Papa ki angioplasty Monday ko hai...","final":false}
{"type":"caption","role":"agent","text":"Estimate ki photo dikhaiye","final":true}
{"type":"interrupted"}
{"type":"step","label":"Reading the estimate","state":"start"}
{"type":"step","label":"Reading the estimate","state":"done"}
{"type":"estimate","estimate":{...HospitalEstimate}}
{"type":"answer","answer":{...DeskAnswer}}
{"type":"card","card":{...DeskCard}}
{"type":"error","code":"model_unavailable","fallback":"text"}
{"type":"ended","summary":{...}}
```

Cards arrive with `verified` already set from the engine trace; there is no separate verification message on the live path.

Heartbeat: client sends `{"type":"ping"}` every 15 s; server replies `pong`. The session ends after 5 minutes (judging cap) or when idle; it uses Live API session resumption to survive network blips.

## 4. Key response shapes

The source of truth is `packages/schemas/src/{hospital,desk,claim}.ts`; abridged here.

```ts
interface DeskAnswer {
  text: string;                       // short, for captions and WhatsApp
  say: string;                        // engine-built line; agents speak it verbatim
  cards: DeskCard[];                  // policy_order | room_compare | ask_desk | billing_branch | top_up_note | warning
  questionForDesk?: string;           // R-HL-010 (billing unknown) or R-HL-014 (package)
  trace: RuleFiring[];
}

interface DeskEvaluation {            // engine output inside answer()
  policyOrder: string[];              // policy ids in claim order (R-HL-006)
  primary: BranchResult;
  alternate?: BranchResult;           // the other branch when billing type is unknown
  questionForDesk?: string;
  trace: RuleFiring[];
}

interface BranchResult {
  billingType: "differential" | "flat" | "package" | "unknown";
  options: {
    roomCategoryId: string; label: string; rentPerDay: number;
    bill: number; admissible: number;
    deductions: { ruleId: string; label: string; amount: number }[];   // R-HL-001, R-HL-005, R-HL-008…
    copay: number; policyPays: number; outOfPocket: number;
    policyShares: { policyId: string; pays: number }[];
  }[];
  recommendedRoomCategoryId: string;
  saving: number;                     // HX-1 differential: 90000; flat: 16000
}

interface PlanDiff {
  fromPlanId: string; toPlanId: string;
  added: Recommendation[]; removed: Recommendation[]; resized: { before: Recommendation; after: Recommendation }[];
  deferred: Recommendation[];
  budget: { beforeMonthly: number; afterMonthly: number };
  safetyScore: { before: number; after: number };
  cellsChanged: { memberId: string; risk: string; before: CellStatus; after: CellStatus; effectiveDate?: string }[];
  calendarChanges: { month: string; before: number; after: number }[];
}

interface Question {
  id: string;
  text: { en: string; hi: string };
  why: string;                                          // "Changes your term cover by about ₹1.5 Cr"
  impact: number;
  kind: "chips" | "number" | "date" | "upload";
  options?: { value: string; label: { en: string; hi: string } }[];
  path: string;                                         // field it answers
}
```
