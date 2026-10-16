# 06 · API specification

**Every endpoint the web app calls on `kavach-api`, with request and response shapes and the events each command writes.** Types refer to [04-data-model.md](04-data-model.md) and the contracts package. The FastAPI app also serves OpenAPI at `/openapi.json` and docs at `/docs` (dev only).

---

## 1. Conventions

- Base URL: `https://api.<domain>` (the Cloud Run URL in the hackathon). Every path below already includes its version prefix (`/v1/...`), so clients join base URL + path as written; there is no `/v1` in the base URL.
- Auth: `Authorization: Bearer <Firebase ID token>` on every call except `/health` and `GET /v1/public/proof`. Demo users get their token from Firebase anonymous sign-in (see `POST /v1/public/demo`).
- JSON, camelCase. Money in integer rupees (`...Inr`). Dates `YYYY-MM-DD`.
- Idempotency: commands accept `Idempotency-Key` header (UUID); repeats within 24 h return the original result.
- Concurrency: commands accept optional `expectedVersion`; mismatch → `409 version_conflict` with current version.
- Errors: `{"error": {"code": "string", "message": "human readable", "details": {...}}}`. Codes: `unauthenticated`, `forbidden`, `not_found`, `validation_failed`, `version_conflict`, `model_unavailable`, `document_unreadable`, `rate_limited`, `internal`.
- Long-running work returns `202` with a resource whose `status` the client watches via Firestore listener.
- Rate limits: 60 req/min per user; 30 model-backed req/min per user.

## 2. Endpoints

### Health and public

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness (`{"ok":true,"version":"…","models":{…}}`) |
| GET | `/v1/public/proof` | Latest eval summary for the Proof page |
| POST | `/v1/public/demo` | **Requires an ID token from Firebase anonymous auth.** Client flow: `signInAnonymously()` → get ID token → call this endpoint with `Authorization: Bearer`. The server verifies the token, clones the Sharma household with that anonymous uid in `access`/`accessUids` (so API calls and Firestore rules both work), and returns `{householdId}`. If the user later signs in with Google, link the anonymous account (`linkWithPopup`) so the uid and household are kept |

### Households and setup

| Method | Path | Body | Returns | Events |
|---|---|---|---|---|
| POST | `/v1/households` | `{name?, city, country:"IN"}` | `{householdId}` | HouseholdCreated |
| POST | `/v1/households/{hid}/intake:parse` | `{text?, audioUploadId?, locale}` | `MembersDraft` (not saved) | – |
| POST | `/v1/households/{hid}/commands/confirm-members` | `{members: MemberInput[]}` | `{version}` | MemberAdded × n |
| POST | `/v1/households/{hid}/commands/update-member` | `{memberId, changes}` | `{version}` | MemberUpdated |
| POST | `/v1/households/{hid}/commands/set-finances` | `{takeHomeMonthlyInr, emiMonthlyInr, fixedSpendMonthlyInr, emergencyFundInr, goldValueInr?}` | `{version, planId}` | FinancesSet, PlanComputed |
| POST | `/v1/households/{hid}/commands/add-liability` / `add-asset` | entity | `{version}` | LiabilityAdded / AssetAdded |
| GET | `/v1/households/{hid}/questions` | – | `Question[]` (≤3) | QuestionAsked |
| POST | `/v1/households/{hid}/commands/answer` | `{questionId, answer}` | `{version, planId}` | QuestionAnswered, FactStated, PlanComputed |
| POST | `/v1/households/{hid}/commands/change-assumption` | `{path, value}` | `{version, planId}` | FactStated, PlanComputed |
| GET | `/v1/households/{hid}/export` | – | ZIP | – |
| DELETE | `/v1/households/{hid}` | `{confirm: "<household name>"}` | `202` | (deletion job) |

### Documents

| Method | Path | Body | Returns | Events |
|---|---|---|---|---|
| POST | `/v1/households/{hid}/documents` | `{storagePath, filename, mimeType, sizeBytes, hint?: DocKind}` | `202 {documentId}` | DocumentAdded; ingest task queued |
| GET | `/v1/households/{hid}/documents/{docId}` | – | `Document` | – |
| POST | `/v1/households/{hid}/documents/{docId}:confirm` | `{acceptedPolicyIds[], edits?}` | `{version}` | PolicyExtracted / PolicyUpdated |
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

| Method | Path | Body | Returns | Events |
|---|---|---|---|---|
| POST | `/v1/households/{hid}/life-changes:parse` | `{text, locale}` | `ChangeSetDraft` | – |
| POST | `/v1/households/{hid}/life-changes` | `{changeSet, expectedVersion}` | `{version, planId, previousPlanId, diff, actionIds[]}` | LifeChangeRecorded + derived, PlanComputed, ActionDrafted × n |
| GET | `/v1/households/{hid}/actions?status=draft` | – | `Action[]` | – |
| PATCH | `/v1/households/{hid}/actions/{aid}` | `{content}` (user edits) | `Action` | – |
| POST | `/v1/households/{hid}/actions/{aid}:approve` | – | `{action, pdfUrl?, icsUrl?}` | ActionApproved |
| POST | `/v1/households/{hid}/actions/{aid}:complete` | `{note?}` | `Action` | ActionCompleted (+ PolicyPlanned / PolicyExtracted if relevant) |
| POST | `/v1/households/{hid}/actions/{aid}:dismiss` | `{reason}` | `Action` | ActionDismissed |
| POST | `/v1/households/{hid}/recommendations/{rid}:handoff` | – | `{partnerCard}` (illustrative) | – |

### Moment 2: hospital desk

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/households/{hid}/desk/sessions` | `{patientMemberId, language, hospitalName?}` | `{sessionId, wsUrl, contextSummary}` |
| WS | `/v1/live/{sessionId}?token=…` | see §3 | streaming |
| POST | `/v1/households/{hid}/desk/sessions/{sid}/captures` | `{storagePath}` | `{estimate: HospitalEstimate}` (also pushed into the live session) |
| POST | `/v1/households/{hid}/desk/sessions/{sid}/turns` | `{text, locale}` (text fallback) | `{reply, cards[]}` |
| POST | `/v1/households/{hid}/desk/sessions/{sid}:evaluate` | `{roomOptions?}` | `DeskEvaluation` (direct engine call; used by UI "compare rooms" control) |
| POST | `/v1/households/{hid}/desk/sessions/{sid}:end` | – | `{summary}` (DeskSessionEnded) |

### Moment 3: claims

| Method | Path | Body | Returns | Events |
|---|---|---|---|---|
| POST | `/v1/households/{hid}/claims` | `{letterDocumentId, policyId?, deskSessionId?}` | `202 {caseId}` | ClaimCaseOpened |
| GET | `/v1/households/{hid}/claims/{caseId}` | – | `ClaimCase` | – |
| POST | `/v1/households/{hid}/claims/{caseId}:draft-appeal` | `{locale}` | `{actionId}` | ActionDrafted |
| POST | `/v1/households/{hid}/claims/{caseId}:status` | `{stage, sentAt?, outcome?}` | `ClaimCase` | ClaimResolved etc. |

### Family access

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/households/{hid}/invites` | `{memberId, language}` | `{inviteUrl, qrPngUrl}` |
| POST | `/v1/invites/{token}:accept` | – | `{householdId}` (MemberJoined) |

### Evals (admin)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/admin/evals` | Start eval run (admin key) |
| GET | `/v1/admin/evals/{runId}` | Run detail |

### Demo controls (demo households only)

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/v1/households/{hid}/demo:clock` | `{date}` | Set demo clock (e.g. jump to 2027-02-08) and re-project |
| POST | `/v1/households/{hid}/demo:reset` | `{persona:"sharma", checkpoint:"setup"\|"job_change"\|"hospital"\|"claim"}` | Replay persona events up to a checkpoint |

## 3. Live WebSocket protocol (`/v1/live/{sessionId}`)

Client → server messages:
```json
{"type":"hello","token":"<ID token>","language":"hi","sampleRate":16000}
{"type":"audio","data":"<base64 PCM16 LE mono 16kHz, 20-40ms>"}
{"type":"audioEnd"}                                  // mic muted
{"type":"frame","data":"<base64 JPEG ≤768px>"}       // ≤1 fps while camera open
{"type":"capture","storagePath":"households/.../uploads/.../estimate.jpg"}
{"type":"text","text":"Room kitna hai?"}
{"type":"setLanguage","language":"en"}
{"type":"end"}
```

Server → client messages:
```json
{"type":"ready","sessionId":"dsk_...","resumable":true}
{"type":"audio","data":"<base64 PCM16 24kHz>"}
{"type":"caption","role":"user","text":"Papa ko admit...","final":false}
{"type":"caption","role":"agent","text":"Estimate ki photo dikhaiye","final":true}
{"type":"interrupted"}
{"type":"step","label":"Reading the estimate","state":"start"}
{"type":"step","label":"Reading the estimate","state":"done"}
{"type":"estimate","estimate":{...HospitalEstimate}}
{"type":"evaluation","evaluation":{...DeskEvaluation}}
{"type":"card","card":{...DeskCard}}
{"type":"cardVerification","cardId":"...","verification":"supported"}
{"type":"error","code":"model_unavailable","fallback":"text"}
{"type":"ended","summary":{...}}
```

Heartbeat: client sends `{"type":"ping"}` every 15 s; server replies `pong`. Idle 15 min → server ends the session.

## 4. Key response shapes

```ts
interface DeskEvaluation {
  patientMemberId: string;
  options: {
    roomLabel: string; roomRentPerDayInr: number;
    billInr: number;
    order: string[];                                   // policy ids in claim order
    perPolicy: { policyId: string; admissibleInr: number; copayInr: number; paysInr: number }[];
    deductions: { ruleId: string; head?: string; amountInr: number; label: string }[];
    outOfPocketInr: number;
  }[];
  recommendedOptionIndex: number;
  savingsInr: number;
  askTheDesk: { id: string; text: { en: string; hi: string } }[];
  warnings: { code: string; text: { en: string; hi: string } }[];
  trace: RuleFiring[];
}

interface PlanDiff {
  fromPlanId: string; toPlanId: string;
  added: Recommendation[]; removed: Recommendation[]; resized: { before: Recommendation; after: Recommendation }[];
  deferred: Recommendation[];
  budget: { beforeMonthlyInr: number; afterMonthlyInr: number };
  safetyScore: { before: number; after: number };
  cellsChanged: { memberId: string; risk: string; before: CellStatus; after: CellStatus; effectiveDate?: string }[];
  calendarChanges: { month: string; beforeInr: number; afterInr: number }[];
}

interface Question {
  id: string;
  text: { en: string; hi: string };
  why: string;                                          // "Changes your term cover by about ₹1.5 Cr"
  impactInr: number;
  kind: "chips" | "number" | "date" | "upload";
  options?: { value: string; label: { en: string; hi: string } }[];
  path: string;                                         // fact path it answers
}
```
