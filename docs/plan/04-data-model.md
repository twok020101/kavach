# 04 · Data model and database design

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**Everything Kavach stores: collections, document shapes, the timeline, indexes, security rules, WhatsApp senders and consent, and sample data for the Sharma family.** The Zod schemas in `packages/schemas/src` are the source of truth in code; this document is the spec they are written from. Where the code is simpler than a shape described here (for example, members are plain values without the `Fact` wrapper yet), the code wins and the richer shape is the target.

Database: **Cloud Firestore (Native mode)**, accessed only by the API through the store module (`apps/api/src/store`, which also has an in-memory implementation for local runs). Files: **Cloud Storage**. Why Firestore: serverless, built-in vector search for clauses, first-class in Firebase. See AD-1, AD-2, AD-7 in [02-architecture.md](02-architecture.md).

---

## 1. Core ideas

1. **Plain current-state documents.** `households/{hid}` holds members, policies and finances as fields; `plans`, `actions`, `deskSessions`, `claimCases`, `documents` and `timeline` are subcollections. Routes update these documents directly. **No event store and no projector for the hackathon**: that was about a day of work with no visible gain, and event sourcing is on the roadmap ([12](12-roadmap.md)).
2. **A timeline written alongside.** Every change a user would recognise (setup, document added, life change, hospital session, claim letter, WhatsApp message) also writes a small `timeline` entry. The Timeline screen and "what changed" read from it; it is a log, not the source of truth.
3. **Every fact has provenance.** Any value that came from a person, a document, an inference, or (later) a data feed carries its source; policy terms carry a `Citation` to the clause.
4. **Products are shared; policies are personal.** `policyProducts` (the wording, clauses, terms; one per UIN/version) is global. A household's policies (schedule: who's insured, SI, dates, premium) link to a product.
5. **Plans are versioned and immutable.** Every recompute writes a new `plans/{planId}` with the engine version, inputs hash, results and trace.
6. **Money is stored in integer rupees** (the `Rupees` schema in `packages/schemas/src/common.ts`). Percentages as numbers 0–100 (`copayPercent`). Dates as ISO `YYYY-MM-DD` strings; timestamps as ISO date-time strings.
7. **IDs:** prefixed ids (`hh_`, `mem_`, `pol_`, `doc_`, `pln_`, `act_`, `dsk_`, `clm_`, `tl_`), generated server-side. Demo households are cloned per visitor with a fresh `hh_` id.

## 2. The `Fact` wrapper

```ts
type Source = "said" | "document" | "inferred" | "rules_pack" | "aa" | "insurer_api" | "employer_feed";
type Confidence = "high" | "medium" | "low";

interface Fact<T> {
  value: T | null;
  source: Source;
  confidence: Confidence;
  evidence?: Evidence[];        // for source=document (see 03 §5.3)
  assumption?: string;          // for source=inferred: "Typical for a metro family of 5"
  setAt: string;                // ISO timestamp of the change that set it
}
```

In the hackathon build, provenance is carried where it is shown: policy terms carry a `Citation` (`PolicyTerms.citations`), and inferred values are flagged in the response that shows them. Wrapping every field in `Fact<T>` is the target shape.

UI rule: `source="inferred"` renders as "We assumed {value} · change". `confidence="low"` renders a dotted underline.

## 3. Collection map

```
users/{uid}
households/{hid}                      members, policies, finances (plain fields)
  ├─ timeline/{entryId}               what happened, for the Timeline screen (written alongside changes)
  ├─ documents/{docId}                uploaded files + extraction status
  ├─ plans/{planId}                   versioned engine outputs
  ├─ actions/{actionId}               prepared actions (drafts → approved → done)
  ├─ deskSessions/{sessionId}         channel (app | live | whatsapp), estimate, last answer, cards
  ├─ claimCases/{caseId}
  └─ invites/{inviteId}
whatsappSenders/{e164}                number → household member, consent, last inbound time
whatsappMessages/{messageId}          message log (no media kept), for rate limits and the 24-hour window
usage/{yyyy-mm-dd}                    live-minutes counter (daily ceiling switches the desk to text mode)
policyProducts/{productId}           shared library (wording-level)
  └─ clauses/{clauseId}               verbatim clauses + embedding vector
catalog/{categoryId}                 illustrative cover categories + indicative premium tables
evalRuns/{runId}
  └─ items/{itemId}
```

Rules are not stored in Firestore: they live in `packages/engine/src/rules.ts` (with a readable copy in `data/rules/IN/README.md`) and ship with the code. The demo persona and checkpoints live in `data/personas/sharma.json`.

## 4. Documents in detail

### 4.1 `users/{uid}`

| Field | Type | Notes |
|---|---|---|
| `displayName` | string | |
| `email` | string? | from Firebase Auth |
| `phone` | string? | E.164; later phone OTP |
| `locale` | `"en" \| "hi"` | UI and voice language |
| `textScale` | `"normal" \| "large" \| "xl"` | accessibility |
| `households` | `{ [hid]: "owner" \| "member" }` | membership index |
| `defaultHouseholdId` | string | |
| `consents` | `ConsentRecord[]` | `{purpose, version, grantedAt, withdrawnAt?}` (DPDP) |
| `createdAt`, `lastSeenAt` | Timestamp | |
| `isDemo` | bool | anonymous demo users |

### 4.2 `households/{hid}`

The household in one document (schema `Household` in `packages/schemas/src/household.ts`). Small enough to read whole on every request.

| Field | Type | Notes |
|---|---|---|
| `id`, `name` | string | "Sharma family" |
| `country` | `"IN"` | selects the rules |
| `city` | string | "Bengaluru" |
| `members` | `Member[]` | §4.3 |
| `policies` | `Policy[]` | §4.4 |
| `finances` | `Finances?` | the 4 money facts: `takeHomeMonthly`, `emiMonthly`, `fixedSpendMonthly`, `emergencyFund` |
| `accessUids` | string[] | logins allowed to read and change this household (checked by the API) |
| `access` | `{ [uid]: { role: "owner"\|"member", memberId? } }` | target shape: links a login to a person (Kamala's login → `mem_kamala`) |
| `currentPlanId` | string? | |
| `isDemo` | bool | |
| `asOf` | string? | demo clock (ISO date); real households use today |
| `createdAt`, `updatedAt` | string | |

Writes are last-writer-wins on the document, with a Firestore transaction where a route reads and writes in one step (e.g. approving an action and updating the plan).

### 4.3 Members

```ts
interface Member {
  id: string;                            // mem_...
  name: string;
  relation: "self" | "spouse" | "child" | "parent" | "parent_in_law" | "other";
  age: number;
  language: "en" | "hi";                 // UI, voice and WhatsApp reply language
  phone?: string;                        // E.164; recognises the member on WhatsApp
  whatsappConsentAt?: string;            // set when the member says YES to the first-message consent
  conditions: string[];                  // e.g. ["diabetes_t2"]
  earning?: boolean;
  // target shape (Layer 3): each field wrapped in Fact<T> for provenance; dependent; dateOfBirth; linkedUid
}
```

**Channel fields.** `phone` and `whatsappConsentAt` live on the member; the per-number state (last inbound time for the 24-hour window, preferred channel, opt-out) lives in `whatsappSenders/{e164}` (§4.12) so the webhook can look a sender up without scanning households.

Employment, liabilities and assets are target shapes for the cover map beyond health (Layer 3); the hero and the claim flow need only members, policies and finances. A job change is recorded on the policy (`employer`, `endDate`) and in the timeline.

### 4.4 Policies

```ts
interface Policy {
  id: string;                            // pol_...
  kind: "group_health" | "retail_health" | "super_top_up" | "term_life" | "personal_accident" | "endowment" | "motor";
  insurer: string;
  productName: string;
  uin?: string;
  productId?: string;                    // → policyProducts (when the wording is known)
  source: "employer" | "personal";
  employer?: string;                     // group cover ends when this employment ends
  holderMemberId: string;
  coveredMemberIds: string[];
  sumInsured: number;                    // rupees
  claimsUsedThisYear: number;
  premiumAnnual?: number;
  continuousCoverSince?: string;         // waiting periods count from here (carried over on migration)
  startDate: string;
  endDate: string;                       // renewal or expiry; GMC end = employment end
  terms: PolicyTerms;
}

interface PolicyTerms {                  // what the engine needs; each may carry a citation
  roomRentLimitPerDay?: number;
  icuLimitPerDay?: number;               // caps ICU rent only; ICU is never proportionately deducted (R-HL-002)
  copayPercent: number;
  copayFromAge?: number;
  deductible: number;                    // super top-up
  proportionateDeduction: boolean;
  citations: Record<string, Citation>;   // e.g. { roomRentLimitPerDay: {documentId, page, clauseRef, quote} }
}
```

### 4.5 `households/{hid}/documents/{docId}`

| Field | Type | Notes |
|---|---|---|
| `storagePath` | string | `households/{hid}/uploads/{uploadId}/{filename}` |
| `filename`, `mimeType`, `sizeBytes`, `sha256` | | dedupe on sha256 |
| `kind` | `policy_schedule \| policy_wording \| benefits_summary \| ecard \| hospital_estimate \| hospital_bill \| claim_letter \| rejection_letter \| other` | from DocClassifier |
| `status` | `uploaded \| classifying \| extracting \| segmenting \| embedding \| extracting_terms \| verifying \| ready \| failed` | drives the progress UI |
| `progress` | `{ step: string, done: number, total: number }` | "Reading page 14 of 42" |
| `pageCount` | int | |
| `pageImagePaths` | string[] | Storage paths of rendered pages |
| `extraction` | map | kind-specific result (PolicyScheduleExtraction, HospitalEstimate, SettlementLetter) |
| `linkedPolicyIds`, `linkedProductId` | | |
| `isSample` | bool | true for our MARKED-SAMPLE demo docs |
| `uploadedBy`, `createdAt`, `updatedAt` | | |
| `error` | `{ code, message }?` | |

### 4.6 `policyProducts/{productId}` (shared library)

`productId` = `prod_{country}_{UIN}_{versionDate}` (or a hash if no UIN printed).

| Field | Type | Notes |
|---|---|---|
| `country` | "IN" | |
| `insurer`, `productName`, `uin`, `versionDate` | string | |
| `line`, `subtype` | enums | |
| `sourceUrl` | string? | for public wordings |
| `wordingStoragePath` | string | |
| `pageCount` | int | |
| `clauseCount` | int | |
| `terms` | `PolicyTerms` | see below |
| `termsVersion` | string | bump on re-extraction |
| `termsVerification` | `{ supported: n, partial: n, unsupported: n }` | |
| `keywordIndex` | `{ [keyword]: clauseId[] }` | for hybrid retrieval |
| `ingestModel` | string | model IDs used |
| `isPublic` | bool | public wordings are visible across households; private ones (e.g. a GMC from a user upload) are scoped to `ownerHouseholdIds` |
| `ownerHouseholdIds` | string[] | for private products |
| `ownerUids` | string[] | denormalised union of those households' `accessUids`, for security rules |

```ts
interface Termed<T> { value: T | null; status: "found"|"not_found"|"conflict"; evidence: Evidence[]; verification: "supported"|"partially_supported"|"unsupported"|"unchecked"; }

interface PolicyTerms {
  roomRent: Termed<{ type: "none"|"percent_of_si"|"fixed_amount"|"category"; normalPct?: number; icuPct?: number; normalInr?: number; icuInr?: number; category?: string }>;
  proportionateDeduction: Termed<{ applies: boolean; excludedHeads: Head[]; icuExempt: boolean; onlyRoomPricedHeads: boolean }>;   // Head = LineHead in packages/schemas/src/hospital.ts
  copay: Termed<{ pct: number; condition?: { minAge?: number; zone?: string; nonNetwork?: boolean } }[]>;
  deductibleInr: Termed<number>;
  deductibleType: Termed<"per_claim"|"aggregate">;
  subLimits: Termed<{ ailment: string; limitInr?: number; limitPctSi?: number }[]>;
  waiting: Termed<{ initialDays: number; specificDiseaseMonths: number; pedMonths: number }>;
  cumulativeBonus: Termed<{ pctPerYear: number; maxPct: number }>;
  restoration: Termed<{ available: boolean; note?: string }>;
  preHospDays: Termed<number>;
  postHospDays: Termed<number>;
  migrationPortability: Termed<{ groupToIndividual: boolean; windowDays?: number }>;
  grievance: Termed<{ present: boolean }>;
  claimIntimation: Termed<{ plannedHoursBefore?: number; emergencyHoursAfter?: number }>;
}
```

### 4.7 `policyProducts/{productId}/clauses/{clauseId}`

| Field | Type |
|---|---|
| `clauseRef` | string ("4.2.1", "Excl02") |
| `headingPath` | string[] |
| `category` | enum (see 03 §4.3) |
| `pageStart`, `pageEnd` | int |
| `text` | string (verbatim) |
| `textHash` | string |
| `embedding` | **Vector(768)** |
| `ocr` | bool |

### 4.8 `households/{hid}/plans/{planId}`

| Field | Type | Notes |
|---|---|---|
| `version` | int | 1, 2, 3… |
| `asOf` | string | date the plan is computed for (e.g. 2026-12-01 for a job-change preview) |
| `basedOnHouseholdUpdatedAt` | string | household version the plan was computed from |
| `engineVersion`, `rulesPackVersion` | string | |
| `inputsHash` | string | sha256 of normalised inputs (reproducibility) |
| `status` | `current \| superseded \| preview` | |
| `needs` | `Need[]` | per member × risk: required ₹, existing ₹ by layer, gap ₹ |
| `coverMap` | `CoverMap` | cells (see 05 §3) |
| `budget` | `{ monthlyInr, annualInr, method, trace }` | |
| `recommendations` | `Recommendation[]` | `{id, category, members, sizeInr, indicativePremiumAnnualInr, priority, closesGapInr, reason, deferred: bool, deferReason?}` |
| `safetyScore` | `{ value, before?, breakdown: {risk, weight, coveredPct}[] }` | |
| `calendar` | `{ months: {month, items[], totalInr}[], spikeMonths[], setAsideMonthlyInr }` | |
| `diff` | `PlanDiff?` | vs previous plan |
| `trace` | `RuleFiring[]` | `{ruleId, inputs, output, citation}` |
| `createdAt` | | |

### 4.9 `households/{hid}/actions/{actionId}`

| Field | Type | Notes |
|---|---|---|
| `kind` | `migration_letter \| reminder \| grievance_letter` (schema `Action`); later `portability_request \| hr_email \| partner_handoff \| ombudsman_complaint \| desk_checklist` | A `reminder` with a `dueDate` is also sent as a dated WhatsApp nudge (`dated_reminder` template) to the owner |
| `title` | string | "Ask to move your parents to an individual policy" |
| `dueDate` | string? | "2026-11-15" |
| `status` | `draft \| approved \| done \| dismissed` | |
| `content` | map | kind-specific: letter sections, email subject/body, reminder text |
| `renderedPdfPath` | string? | after approval |
| `sourcePlanId`, `sourceCaseId`, `sourceSessionId` | | |
| `evidence` | Evidence[] | clauses that justify it |
| `verification` | VerificationReport | |
| `approvedBy`, `approvedAt`, `completedAt` | | |
| `history` | `{at, by, change}[]` | user edits |

### 4.10 `households/{hid}/deskSessions/{sessionId}`

Schema `DeskSession` in `packages/schemas/src/desk.ts`.

| Field | Type |
|---|---|
| `patientMemberId`, `speakerMemberId` | string |
| `language` | "hi" \| "en" |
| `channel` | `app \| live \| whatsapp` (which door the session came through) |
| `hospitalName`, `admissionType` (`planned \| emergency`), `treatment` | string |
| `contextPack` | snapshot of policies/terms used (for audit) |
| `estimateDocumentId` | string? |
| `estimate` | `HospitalEstimate?` |
| `billingTypeAnswer` | `differential \| flat \| package`? (the desk's answer to the R-HL-010 question) |
| `lastAnswer` | `DeskAnswer?` (`text`, `say`, `cards[]`, `questionForDesk?`, `trace`) |
| `householdAlertSentAt` | string? (Rahul's alert; WhatsApp template, free-form in window, or in-app) |
| `status` | `active \| ended` |
| `summary` | `{ en: string, hi: string }` |
| `metrics` | `{ firstAudioMs[], turns, toolCalls, durationS }` |
| `createdAt`, `endedAt` | |

`DeskCard`: `{ id, kind: "policy_order"|"room_compare"|"ask_desk"|"billing_branch"|"top_up_note"|"warning", title, body, amounts[{label, amount, emphasis}], ruleIds[], verified }`. `verified` is true when every number on the card came from the engine trace. The same card renders as a PNG for WhatsApp.

`HospitalEstimate` (what the estimate reader extracts; schema in `packages/schemas/src/hospital.ts`):
```ts
interface HospitalEstimate {
  hospitalName: string;
  patientName?: string;
  procedure: string;                         // "PTCA (angioplasty)"
  admissionType: "planned" | "emergency";
  days: number;
  billingType: "differential" | "flat" | "package" | "unknown";
  roomCategories: { id: string; label: string; rentPerDay: number }[];   // the room-category tariff
  lines: {
    head: "room"|"nursing"|"surgeon"|"ot"|"doctor_visits"|"icu"|"implant"|"pharmacy"|"consumables"|"diagnostics"|"non_payable"|"other";
    label: string;
    pricedByRoom: boolean;                   // true when the tariff charges a different amount in each room category
    amounts: Record<string, number>;         // amount per room category id
  }[];
  packagePrices?: Record<string, number>;    // package rate per room category, when quoted
  needsConfirmation: boolean;                // totals don't add up or a field was unreadable
  notes: string[];                           // e.g. the tariff note printed on the estimate
}
```

The engine's result for it is `DeskEvaluation`: `policyOrder[]`, a `primary` branch (per room option: bill, admissible, deductions by rule, co-pay, policy pays, out-of-pocket, policy shares; recommended room; saving), an `alternate` branch when the billing type is unknown, `questionForDesk?` and the `trace`.

### 4.11 `households/{hid}/claimCases/{caseId}`

| Field | Type |
|---|---|
| `patientMemberId`, `policyId`, `deskSessionId?` | string |
| `letter` | `SettlementLetter` (insurer, claim no., patient, hospital, `billAmount`, `approvedAmount`, `deductions[{label, amount, reasonGiven}]`, `copayApplied`, `letterDate`) |
| `letterDocumentId`, `billDocumentId?` | string |
| `assessment` | `ClaimAssessment`: `deductions[{label, amount, verdict: "challengeable"\|"possibly"\|"valid", recoverable, ruleId, reason, citation}]`, `recoverable`, `expectedPayout`, `trace` |
| `channel` | `app \| whatsapp` (where the letter came in) |
| `appealActionId` | string? |
| `escalation` | `{ stage: "insurer_gro"\|"bima_bharosa"\|"ombudsman", sentAt?, replyDueBy?, outcome? }[]` |
| `status` | `reading \| assessed \| appeal_drafted \| appeal_sent \| resolved` |

### 4.12 WhatsApp collections

**`whatsappSenders/{e164}`**

| Field | Type | Notes |
|---|---|---|
| `householdId`, `memberId` | string | set when the number matches a member's `phone`; unknown numbers get a short "ask your family to add this number" reply (judges: the demo flow links their number to the demo household) |
| `provider` | `meta \| twilio` | which door the number uses |
| `consent` | `{ grantedAt?, withdrawnAt?, version }` | DPDP consent from the first message; nothing is processed before `grantedAt` |
| `lastInboundAt` | string | drives the 24-hour free-form window |
| `optedOut` | bool | "STOP" turns off proactive messages |
| `rateWindow` | `{ startedAt, count }` | per-sender rate limit |

**`whatsappMessages/{messageId}`**: `{ e164, direction: "in"|"out", kind: "text"|"voice"|"image"|"template", template?: "household_alert"|"dated_reminder", deskSessionId?, claimCaseId?, at }`. Media is **not** kept: it is downloaded, processed and deleted; only the extracted result is stored on the desk session or claim case.

### 4.13 Other collections

- **`timeline/{entryId}`** (under the household): `{ kind: "setup"|"document_added"|"life_change"|"plan_computed"|"action_approved"|"desk_session"|"claim_case"|"whatsapp"|"consent", title, detail?, effectiveDate?, at, refId? }`. Written by the route that made the change.
- **`invites/{inviteId}`**: `{ householdId, memberId, role, language, token (hashed), expiresAt, acceptedBy? }`. Kamala's invite pre-sets Hindi and the simplified home.
- **`catalog/{categoryId}`**: illustrative categories (`term_life`, `family_floater_health`, `senior_health`, `super_top_up`, `personal_accident`, `critical_illness`, `motor_comprehensive`, `device`, `travel_international`) with indicative premium tables by age band and SI. Marked `illustrative: true`.
- **`evalRuns/{runId}`**: `{ model, startedAt, dataset, metrics, perField, costInr, latencyP50 }`, `items/{itemId}` per wording × field with expected/actual/citation-ok.
- **`usage/{date}`**: `{ liveMinutes, liveSessions }`; when `liveMinutes` passes the daily ceiling the desk starts in text mode.
- **Demo checkpoints** come from `data/personas/sharma.json` (`setup: 2026-10-14`, `job_change: 2026-11-10`, `hospital: 2027-02-08`, `claim: 2027-03-02`), not from Firestore.

## 5. Timeline entries

The household is plain documents, so there is no event catalogue to replay. Each route writes the document change and, where a person would want to see it, a timeline entry:

| Route / action | Document change | Timeline entry | Plan recompute |
|---|---|---|---|
| Create household, confirm members | `households/{hid}` members | `setup` | yes |
| Set money facts / answer a question | `finances` / member or policy field | – | yes |
| Document ingested | `documents/{docId}`; policy added or merged with citations | `document_added` | yes |
| Life change confirmed | policy `endDate`/new policies; `plans/{n+1}` with diff | `life_change` (with `effectiveDate`) | yes |
| Action approved | `actions/{aid}` status, PDF path; dated WhatsApp reminder scheduled | `action_approved` | no |
| Desk session (any door) | `deskSessions/{sid}` | `desk_session` | no |
| Claim letter assessed | `claimCases/{cid}`; `claimsUsedThisYear` on the policy | `claim_case` | yes |
| WhatsApp consent / opt-out | `whatsappSenders/{e164}` | `consent` | no |

The cover map *as of any date* (the timeline scrubber in moment 1) still works without events: the engine reads each policy's `startDate`/`endDate` and computes the map for the requested date.

## 6. Plan recompute

```ts
// apps/api: after any plan-relevant change
const household = await store.get<Household>('households', hid);
const plan = engine.plan(household, { asOf });          // pure; @kavach/engine
await store.set(`households/${hid}/plans`, plan.id, { ...plan, diff: engine.diff(previous, plan) });
await store.update('households', hid, { currentPlanId: plan.id });
```

- The engine is pure, so the same household and a different `asOf` give "show me 1 December".
- Previews (a future `asOf`) are returned without saving, or stored with `status: "preview"`.

## 7. Cloud Storage layout

```
gs://kavach-<env>-docs/
  households/{hid}/uploads/{uploadId}/{original-filename}
  households/{hid}/pages/{docId}/{pageNo}.png
  households/{hid}/letters/{actionId}.pdf
  households/{hid}/whatsapp/{messageId}.{ogg,png}     (outbound voice notes and card images; short-lived signed URLs for Twilio)
  products/{productId}/wording.pdf
  products/{productId}/pages/{pageNo}.png
  samples/...                                   (demo sample docs, public-read for the landing page)
```

Lifecycle rule: objects under `households/` of demo households deleted after 30 days; inbound WhatsApp media is never written here (processed in memory and dropped); outbound WhatsApp media deleted after 1 day.

Locally, with `GCS_BUCKET` empty, the same paths are written under `.data/blobs/`.

## 8. Indexes

`infra/firestore.indexes.json` must include:

| Collection (group) | Fields | Purpose |
|---|---|---|
| `timeline` | `at DESC` | Timeline screen (single-field, automatic) |
| `whatsappMessages` | `e164 ASC, at DESC` | 24-hour window and rate limit |
| `plans` | `status ASC, version DESC` | current plan lookup |
| `actions` | `status ASC, dueDate ASC` | checklist |
| `documents` | `kind ASC, createdAt DESC` | vault |
| `clauses` (collection group) | **vector** `embedding` (768, flat) + `category ASC` prefilter | `findNearest` with category filter |
| `policyProducts` | `uin ASC, versionDate DESC` | product match |

Vector index creation (example):
```
gcloud firestore indexes composite create \
  --collection-group=clauses --query-scope=COLLECTION \
  --field-config=field-path=category,order=ASCENDING \
  --field-config=field-path=embedding,vector-config='{"dimension":"768","flat":"{}"}'
```

## 9. Security rules (`infra/firestore.rules`)

The browser never talks to Firestore or Storage directly: every read and write goes through the API, which uses the Admin SDK and checks `request uid ∈ households/{hid}.accessUids` itself. So the rules deny all client access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Storage is the same: uploads go through the API (`@fastify/multipart`, max 15 MB, PDF/JPEG/PNG/HEIC/WebP), and the bucket allows no client access. Sample documents for the landing page are served by the web app from `data/samples` copies, not from the bucket.

The richer per-household rules in earlier drafts (member reads through listeners) are only needed if the web app starts reading Firestore directly; the implementation plan keeps reads in the API for the hackathon.

## 10. Sample data: the Sharma household (abridged)

The full household is `data/personas/sharma.json` (loaded by `apps/api/src/demo/sharma.ts`). Kamala and Suresh moved from Lucknow to live with Rahul in Bengaluru. Phone numbers are placeholders.

`households/hh_sharma` (at the `setup` checkpoint):
```json
{
  "id": "hh_sharma", "name": "Sharma family", "city": "Bengaluru", "country": "IN", "isDemo": true,
  "members": [
    {"id": "mem_rahul",  "name": "Rahul",  "relation": "self",   "age": 34, "language": "en", "phone": "+910000000001", "earning": true},
    {"id": "mem_priya",  "name": "Priya",  "relation": "spouse", "age": 32, "language": "en", "earning": false},
    {"id": "mem_anaya",  "name": "Anaya",  "relation": "child",  "age": 5,  "language": "en"},
    {"id": "mem_suresh", "name": "Suresh", "relation": "parent", "age": 62, "language": "hi", "conditions": ["diabetes_t2"]},
    {"id": "mem_kamala", "name": "Kamala", "relation": "parent", "age": 58, "language": "hi", "phone": "+910000000002"}
  ],
  "finances": {"takeHomeMonthly": 185000, "emiMonthly": 28000, "fixedSpendMonthly": 70000, "emergencyFund": 400000},
  "policies": [
    {"id": "pol_gmc_acme", "kind": "group_health", "source": "employer", "employer": "Acme Software",
     "coveredMemberIds": ["mem_rahul","mem_priya","mem_anaya","mem_suresh","mem_kamala"], "sumInsured": 500000,
     "startDate": "2026-04-01", "endDate": "2027-03-31",
     "terms": {"roomRentLimitPerDay": 5000, "copayPercent": 0, "proportionateDeduction": true}},
    {"id": "pol_supertopup", "kind": "super_top_up", "source": "personal", "sumInsured": 500000, "premiumAnnual": 14200,
     "startDate": "2026-06-15", "endDate": "2027-06-14", "terms": {"deductible": 500000, "proportionateDeduction": false}},
    {"id": "pol_lic_endow", "kind": "endowment", "sumInsured": 1000000, "premiumAnnual": 48000, "endDate": "2041-08-20"},
    {"id": "pol_motor", "kind": "motor", "sumInsured": 1100000, "premiumAnnual": 21500, "endDate": "2027-01-09"}
  ]
}
```

From the `job_change` checkpoint the household also has `pol_gmc_startup` (Orbit Labs, ₹3,00,000, Rahul, Priya and Anaya only, from 1 Dec) and **`pol_parents_migrated`** (the parents' individual floater migrated from the Acme group cover: SI ₹5,00,000, room-rent limit ₹5,000/day, 20% co-pay from age 61, continuous cover since 2022-04-01). That is the policy the hospital desk uses. At the `claim` checkpoint its `claimsUsedThisYear` is ₹2,04,640 (CX-1).

Full persona details are in [09-demo-data-and-script.md](09-demo-data-and-script.md).

## 11. Retention, export and deletion

- **Export:** `GET /v1/households/{hid}/export` returns a ZIP: the household document, timeline, plans, actions, desk sessions, claim cases and uploaded files.
- **Delete:** `DELETE /v1/households/{hid}` (owner only, typed confirmation) deletes the subtree and Storage prefix via a background job; writes an audit record (no PII) to `auditLog/`.
- **Consent withdrawal:** stops processing; data deleted within the policy window stated in the privacy notice. On WhatsApp, "STOP" withdraws consent for that number and stops proactive messages.

## 12. Future-proofing notes

- **Event sourcing (roadmap):** when connectors and audit needs arrive, move the household to an append-only `events` subcollection with a materialised projection. The timeline entries and the plain documents are shaped to make that migration a replay: each timeline entry already records what changed and when it takes effect.
- **Connectors** write facts with `source: "aa"` etc. A `connectorLinks/{id}` collection under the household stores consent handles and fetch schedules (later).
- **Multi-country:** `country` on household and product; rules per country; a currency field can be added to money (`currency: "INR"|"SGD"`) in a v2 schema.
- **Analytics:** Firestore → BigQuery export (with PII fields hashed) for funnel metrics.
- **Migration path:** if relational reporting becomes important, the store interface (`apps/api/src/store`) is the only place that knows about Firestore.
