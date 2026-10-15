# 04 · Data model and database design

**Everything Kavach stores: collections, document shapes, the event log, how state is projected from it, indexes, security rules, and sample data for the Sharma family.** The Pydantic models in `packages/contracts` are the source of truth in code; this document is the spec they are written from.

Database: **Cloud Firestore (Native mode)**. Files: **Cloud Storage**. Why Firestore: realtime listeners (the cover map updates live), serverless, built-in vector search for clauses, first-class in Firebase. See AD-1, AD-2, AD-7 in [02-architecture.md](02-architecture.md).

---

## 1. Core ideas

1. **Event-sourced household.** `households/{hid}/events` is the append-only source of truth. `households/{hid}/projection/current` is a materialised view rebuilt from events. Nothing edits the projection except the projector.
2. **Every fact has provenance.** Any value that came from a person, a document, an inference, or (later) a data feed is wrapped in a `Fact`.
3. **Products are shared; policies are personal.** `policyProducts` (the wording, clauses, terms; one per UIN/version) is global. A household's `policies` (schedule: who's insured, SI, dates, premium) link to a product.
4. **Plans are versioned and immutable.** Every recompute writes a new `plans/{planId}` with the engine version, rules-pack version, inputs hash, results and trace.
5. **Money is stored in integer rupees** (`int`, field names end in `Inr`). Percentages as decimals in `[0,1]` with names ending in `Pct`. Dates as ISO `YYYY-MM-DD` strings (calendar dates) and timestamps as Firestore `Timestamp`.
6. **IDs:** ULIDs with a prefix (`hh_`, `mem_`, `pol_`, `evt_`, `doc_`, `pln_`, `act_`, `dsk_`, `clm_`), generated server-side. Sortable by time, safe in URLs.

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
  setByEventId: string;         // evt_...
  updatedAt: Timestamp;
}
```

UI rule: `source="inferred"` renders as "We assumed {value} · change". `confidence="low"` renders a dotted underline.

## 3. Collection map

```
users/{uid}
households/{hid}
  ├─ events/{eventId}                 append-only
  ├─ projection/current               materialised HouseholdState
  ├─ documents/{docId}                uploaded files + extraction status
  ├─ plans/{planId}                   versioned engine outputs
  ├─ actions/{actionId}               prepared actions (drafts → approved → done)
  ├─ deskSessions/{sessionId}
  │    ├─ turns/{turnId}              captions (optional storage, on by default for demo)
  │    └─ cards/{cardId}              answer cards with verification
  ├─ claimCases/{caseId}
  └─ invites/{inviteId}
policyProducts/{productId}           shared library (wording-level)
  └─ clauses/{clauseId}               verbatim clauses + embedding vector
rulesPacks/{country_version}         e.g. IN_2026.10.1 (mirror of data/rules YAML, read-only)
catalog/{categoryId}                 illustrative cover categories + indicative premium tables
evalRuns/{runId}
  └─ items/{itemId}
demo/{key}                            demo personas, demo clock config
```

## 4. Documents in detail

### 4.1 `users/{uid}`

| Field | Type | Notes |
|---|---|---|
| `displayName` | string | |
| `email` | string? | from Firebase Auth |
| `phone` | string? | later (phone OTP) |
| `locale` | `"en" \| "hi"` | UI and voice language |
| `textScale` | `"normal" \| "large" \| "xl"` | accessibility |
| `households` | `{ [hid]: "owner" \| "member" }` | membership index |
| `defaultHouseholdId` | string | |
| `consents` | `ConsentRecord[]` | `{purpose, version, grantedAt, withdrawnAt?}` (DPDP) |
| `createdAt`, `lastSeenAt` | Timestamp | |
| `isDemo` | bool | anonymous demo users |

### 4.2 `households/{hid}`

Small, frequently read root document.

| Field | Type | Notes |
|---|---|---|
| `name` | string | "Sharma family" |
| `country` | `"IN"` | selects rules pack |
| `city` | string | "Bengaluru" |
| `cityTier` | `1 \| 2 \| 3` | from rules pack city list; Fact in projection |
| `ownerUid` | string | |
| `access` | `{ [uid]: { role: "owner"\|"member", memberId?: string, addedAt } }` | memberId links a login to a person (Kamala's login → `mem_kamala`) |
| `accessUids` | string[] | denormalised for security rules `in` checks |
| `version` | int | last applied event sequence; optimistic concurrency |
| `currentPlanId` | string | |
| `safetyScore` | int | denormalised for lists |
| `rulesPackVersion` | string | "IN_2026.10.1" |
| `demoClock` | string? | ISO date override for demo mode only |
| `isDemo` | bool | |
| `createdAt`, `updatedAt` | Timestamp | |

### 4.3 `households/{hid}/events/{eventId}`

| Field | Type | Notes |
|---|---|---|
| `seq` | int | 1, 2, 3… strictly increasing; equals household `version` after append |
| `type` | string | see catalogue §5 |
| `payload` | map | type-specific, schema-validated |
| `source` | Source | |
| `actor` | `{ kind: "user"\|"agent"\|"system"\|"connector", uid?, agent? }` | who caused it |
| `effectiveDate` | string? | when the fact becomes true in the world (e.g. 2026-12-01) — distinct from `recordedAt` |
| `recordedAt` | Timestamp | when Kavach learned it |
| `causationId` | string? | event or command that caused this one |
| `correlationId` | string | groups events from one user action |
| `schemaVersion` | int | for upcasting old events |

Append protocol (in a Firestore transaction):
1. Read `households/{hid}.version` = v.
2. Write events with `seq` = v+1…v+n (document ID = `evt_<ULID>`).
3. Update `version` = v+n.
4. Commit. On contention, retry (max 3).
5. After commit: projector updates `projection/current`; plan recompute if the event type is plan-relevant.

**Bitemporal by design:** `effectiveDate` lets the engine compute the cover map *as of any date* (the timeline scrubber in moment 1), while `recordedAt` keeps the audit trail.

### 4.4 `households/{hid}/projection/current` (HouseholdState)

```ts
interface HouseholdState {
  version: number;                       // = last event seq applied
  asOf: string;                          // projection date (today or demo clock)
  members: Record<MemberId, Member>;
  finances: Finances;
  employments: Record<EmploymentId, Employment>;
  liabilities: Record<LiabilityId, Liability>;
  assets: Record<AssetId, Asset>;
  policies: Record<PolicyId, Policy>;
  plannedEvents: PlannedEvent[];         // future-dated changes not yet effective
  openQuestions: Question[];
  coverMapSummary: CoverMapSummary;      // denormalised for fast home render
}

interface Member {
  id: string;                            // mem_...
  name: Fact<string>;
  relation: Fact<Relation>;              // self|spouse|child|father|mother|father_in_law|mother_in_law|sibling|other_dependent
  dateOfBirth?: Fact<string>;
  age: Fact<number>;
  gender?: Fact<"female"|"male"|"other">;
  dependent: Fact<boolean>;
  earning: Fact<boolean>;
  conditions: Fact<Condition[]>;         // e.g. [{code:"diabetes_t2", since:"2019"}]
  language?: Fact<"en"|"hi">;
  linkedUid?: string;                    // if this person has a login
}

interface Finances {
  takeHomeMonthlyInr: Fact<number>;
  emiMonthlyInr: Fact<number>;           // derived sum of liabilities if known, else stated
  fixedSpendMonthlyInr: Fact<number>;
  emergencyFundInr: Fact<number>;
  goldValueInr?: Fact<number>;           // optional; counted as liquidity
  annualIncomeInr: Fact<number>;         // inferred from take-home if not stated (rules pack ratio)
}

interface Employment {
  id: string; memberId: string;
  employerName: Fact<string>;
  startDate?: Fact<string>;
  endDate?: Fact<string>;                // set by a job-change event
  groupPolicyIds: string[];              // GMC/GPA/GTL provided by this employer
}

interface Liability {
  id: string;
  type: Fact<"home"|"car"|"personal"|"education"|"other">;
  outstandingInr: Fact<number>;
  emiInr: Fact<number>;
  endDate?: Fact<string>;
  borrowerMemberIds: string[];
}

interface Asset {
  id: string;
  type: Fact<"vehicle"|"device"|"home"|"gold"|"other">;
  description: Fact<string>;             // "Hyundai Creta 2023", "iPhone 17 Pro"
  valueInr: Fact<number>;
  purchaseDate?: Fact<string>;
  ownerMemberId?: string;
}

interface Policy {
  id: string;                            // pol_...
  productId?: string;                    // → policyProducts (when wording known)
  insurer: Fact<string>;
  productName: Fact<string>;
  uin?: Fact<string>;
  policyNumberMasked: Fact<string>;      // last 4 visible; full number only in documents
  line: Fact<"health"|"term_life"|"endowment"|"ulip"|"personal_accident"|"critical_illness"|"motor"|"device"|"travel"|"home">;
  subtype?: Fact<"individual"|"floater"|"top_up"|"super_top_up"|"group"|"senior"|"standard_arogya_sanjeevani">;
  layer: Fact<"statutory"|"employer"|"personal">;
  holderMemberId: string;
  insuredMemberIds: Fact<string[]>;
  sumInsuredInr: Fact<number>;
  deductibleInr?: Fact<number>;
  cumulativeBonusInr?: Fact<number>;
  premiumInr?: Fact<number>;
  premiumMode?: Fact<"annual"|"half_yearly"|"quarterly"|"monthly"|"single"|"employer_paid">;
  startDate: Fact<string>;
  endDate: Fact<string>;                 // renewal or expiry; GMC end = employment end
  status: "active"|"ending"|"ended"|"lapsed"|"planned";
  employmentId?: string;                 // for group policies
  termsRef?: { productId: string; termsVersion: string };  // resolved terms live on the product
  overrides?: Partial<PolicyTerms>;      // schedule-specific terms (e.g. GMC room rent negotiated by employer)
  documentIds: string[];
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
  proportionateDeduction: Termed<{ applies: boolean; excludedHeads: Head[] }>;   // Head = pharmacy|consumables|implants|diagnostics|room|icu|nursing|surgeon|ot|doctor|other
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
| `basedOnEventSeq` | int | |
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
| `createdAt`, `createdByEventId` | | |

### 4.9 `households/{hid}/actions/{actionId}`

| Field | Type | Notes |
|---|---|---|
| `kind` | `migration_request \| portability_request \| hr_email \| reminder \| partner_handoff \| grievance_letter \| ombudsman_complaint \| desk_checklist` | |
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

| Field | Type |
|---|---|
| `patientMemberId`, `speakerUid`, `speakerMemberId` | string |
| `language` | "hi" \| "en" |
| `hospitalName`, `admissionType` (`planned \| emergency`), `treatment` | Fact<string> |
| `contextPack` | snapshot of policies/terms used (for audit) |
| `estimateDocumentId` | string? |
| `estimate` | HospitalEstimate? |
| `evaluation` | DeskEvaluation? (engine output, with trace) |
| `status` | `active \| ended \| failed` |
| `mode` | `live \| text` |
| `summary` | `{ en: string, hi: string }` |
| `metrics` | `{ firstAudioMs[], turns, toolCalls, durationS }` |
| `startedAt`, `endedAt` | |

`cards/{cardId}`: `{ type: "which_policy"|"room_advice"|"oop_estimate"|"ask_desk"|"cashless_checklist"|"warning", title, body, amountsInr?, evidence[], verification, createdAt }`.

`HospitalEstimate`:
```ts
interface HospitalEstimate {
  hospitalName?: string;
  patientName?: string;
  treatment?: string;
  roomCategory: string;            // "Deluxe Single"
  roomRentPerDayInr: number;
  expectedDays: number;
  icuDays?: number; icuRentPerDayInr?: number;
  lines: { label: string; head: Head; amountInr: number; evidence: Evidence[] }[];
  totalInr: number;
  readConfidence: Confidence;
  alternatives?: { roomCategory: string; roomRentPerDayInr: number }[];   // if printed on the tariff
}
```

### 4.11 `households/{hid}/claimCases/{caseId}`

| Field | Type |
|---|---|
| `patientMemberId`, `policyId`, `deskSessionId?` | string |
| `claimNumber`, `admissionDate`, `dischargeDate` | Fact<string> |
| `billedInr`, `approvedInr`, `deductedInr` | Fact<number> |
| `letterDocumentId`, `billDocumentId?` | string |
| `deductions` | `{ id, label, amountInr, statedReason, statedCode?, verdict: "challengeable"\|"possibly"\|"valid", ruleIds[], reason, evidence[], verification }[]` |
| `challengeableTotalInr` | int |
| `appealActionId` | string? |
| `escalation` | `{ stage: "insurer_gro"\|"bima_bharosa"\|"ombudsman", sentAt?, replyDueBy?, outcome? }[]` |
| `status` | `assessing \| ready \| appeal_drafted \| appeal_sent \| resolved` |

### 4.12 Other collections

- **`invites/{inviteId}`**: `{ householdId, memberId, role, language, token (hashed), expiresAt, acceptedBy? }`. Kamala's invite pre-sets Hindi and the simplified home.
- **`rulesPacks/{id}`**: read-only mirror of `data/rules/IN/*.yaml` with `version`, `effectiveFrom`, `rules[]` (each with `id`, `statement`, `params`, `sources[]`, `verifiedOn`, `status`).
- **`catalog/{categoryId}`**: illustrative categories (`term_life`, `family_floater_health`, `senior_health`, `super_top_up`, `personal_accident`, `critical_illness`, `motor_comprehensive`, `device`, `travel_international`) with indicative premium tables by age band and SI. Marked `illustrative: true`.
- **`evalRuns/{runId}`**: `{ model, startedAt, dataset, metrics, perField, costInr, latencyP50 }`, `items/{itemId}` per wording × field with expected/actual/citation-ok.
- **`demo/config`**: persona list, default demo clock checkpoints (`setup: 2026-10-14`, `job_change: 2026-11-10`, `hospital: 2027-02-08`, `claim: 2027-03-02`).

## 5. Event catalogue

| Event type | Payload (key fields) | Effect on projection | Triggers plan recompute |
|---|---|---|---|
| `HouseholdCreated` | name, country, city | init | no |
| `MemberAdded` | member (with Facts) | add member | yes |
| `MemberUpdated` | memberId, changed fields | update | yes |
| `MemberRemoved` | memberId, reason | remove | yes |
| `FinancesSet` | 4 money facts (+ gold) | set finances | yes |
| `FactStated` | path, value (answer to a question) | set path | yes |
| `FactInferred` | path, value, assumption | set path (source=inferred) | yes |
| `EmploymentStarted` | memberId, employer, startDate | add employment | yes |
| `EmploymentEnded` | employmentId, endDate | set endDate; group policies → `ending` with endDate | yes |
| `LiabilityAdded` / `Updated` / `Closed` | liability | | yes |
| `AssetAdded` / `Updated` / `Disposed` | asset | | yes |
| `DocumentAdded` | docId, kind? | — (document collection) | no |
| `PolicyExtracted` | policy (Facts with evidence), docId | add/merge policy | yes |
| `PolicyLinkedToProduct` | policyId, productId, termsVersion | link | yes |
| `PolicyUpdated` | policyId, changes | | yes |
| `PolicyEnded` | policyId, endDate, reason | status ended | yes |
| `PolicyPlanned` | category, members, size (from approved plan item) | add planned policy | yes |
| `LifeChangeRecorded` | text, changeSet, effectiveDate | plannedEvents or applied | yes |
| `QuestionAsked` / `QuestionAnswered` | question, answer | openQuestions | answered → yes |
| `PlanComputed` | planId, version, safetyScore | currentPlanId | — |
| `ActionDrafted` / `ActionApproved` / `ActionCompleted` / `ActionDismissed` | actionId | — (actions collection) | no |
| `DeskSessionStarted` / `DeskSessionEnded` | sessionId, patient, summary | timeline | no |
| `ClaimCaseOpened` / `ClaimAssessed` / `AppealApproved` / `ClaimResolved` | caseId, amounts | claims YTD on policy | yes (claims affect bonus/SI left) |
| `MemberInvited` / `MemberJoined` | inviteId, uid | access map | no |
| `ConsentGranted` / `ConsentWithdrawn` | purpose, version | — | no |
| `ConnectorLinked` (later) | connector, consentHandle | — | no |

Upcasting: events carry `schemaVersion`; the projector has `upcast(event)` functions so old events keep working when payloads evolve.

## 6. Projection and plan recompute

```python
def project(events: Iterable[Event], as_of: date) -> HouseholdState:
    state = HouseholdState.empty()
    for e in sorted(events, key=lambda e: e.seq):
        state = apply(state, upcast(e))
    return state.resolve_as_of(as_of)   # applies effective dates: ends GMCs past endDate, activates planned events
```

- `apply` is pure and unit-tested per event type.
- `resolve_as_of` is what makes "show me 1 December" work: the same events, a different date.
- The command layer stores `projection/current` (as of today/demo clock). Previews (`as_of` a future date) are computed on the fly and returned, or stored as a `plans/{id}` with `status=preview`.
- Rebuild tool: `python -m app.projection.rebuild --household hh_...` replays all events (used after projector bug fixes).

## 7. Cloud Storage layout

```
gs://kavach-<env>-docs/
  households/{hid}/uploads/{uploadId}/{original-filename}
  households/{hid}/pages/{docId}/{pageNo}.png
  households/{hid}/letters/{actionId}.pdf
  products/{productId}/wording.pdf
  products/{productId}/pages/{pageNo}.png
  samples/...                                   (demo sample docs, public-read for the landing page)
```

Lifecycle rule: objects under `households/` of demo households deleted after 30 days.

## 8. Indexes

`infra/firestore.indexes.json` must include:

| Collection (group) | Fields | Purpose |
|---|---|---|
| `events` | `seq ASC` | replay (single-field, automatic) |
| `events` | `type ASC, recordedAt DESC` | timeline filters |
| `plans` | `status ASC, version DESC` | current plan lookup |
| `actions` | `status ASC, dueDate ASC` | checklist |
| `documents` | `kind ASC, createdAt DESC` | vault |
| `clauses` (collection group) | **vector** `embedding` (768, flat) + `category ASC` prefilter | `find_nearest` with category filter |
| `policyProducts` | `uin ASC, versionDate DESC` | product match |

Vector index creation (example):
```
gcloud firestore indexes composite create \
  --collection-group=clauses --query-scope=COLLECTION \
  --field-config=field-path=category,order=ASCENDING \
  --field-config=field-path=embedding,vector-config='{"dimension":"768","flat":"{}"}'
```

## 9. Security rules (`infra/firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function isMember(hid) {
      return signedIn() && request.auth.uid in get(/databases/$(db)/documents/households/$(hid)).data.accessUids;
    }

    match /users/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow update: if signedIn() && request.auth.uid == uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['locale','textScale','lastSeenAt']);
    }

    match /households/{hid} {
      allow read: if signedIn() && request.auth.uid in resource.data.accessUids;
      allow write: if false;                       // server only
      match /{sub=**} {
        allow read: if isMember(hid);
        allow write: if false;                     // server only (Admin SDK bypasses rules)
      }
    }

    match /policyProducts/{pid} {
      allow read: if signedIn() && (resource.data.isPublic == true
                   || request.auth.uid in resource.data.ownerUids);
      allow write: if false;
      match /clauses/{cid} {
        // Child rules do not inherit the parent's check, so repeat it here against the parent product.
        allow read: if signedIn() && (
          get(/databases/$(db)/documents/policyProducts/$(pid)).data.isPublic == true
          || request.auth.uid in get(/databases/$(db)/documents/policyProducts/$(pid)).data.ownerUids);
        allow write: if false;
      }
    }

    match /catalog/{id}     { allow read: if true;  allow write: if false; }
    match /rulesPacks/{id}  { allow read: if true;  allow write: if false; }
    match /evalRuns/{id=**} { allow read: if true;  allow write: if false; }   // proof page is public
  }
}
```

Note: a clause rule must check the parent product itself (as above), because Firestore does not apply a parent document's rule to its subcollections. The web app may still fetch private clauses through the API (`GET /v1/products/{productId}/clauses/{clauseId}`), which checks household membership server-side; the rule is the second line of defence.

`infra/storage.rules`:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isMember(hid) {
      return request.auth != null &&
        request.auth.uid in firestore.get(/databases/(default)/documents/households/$(hid)).data.accessUids;
    }
    match /households/{hid}/uploads/{uploadId}/{file} {
      allow read: if isMember(hid);
      allow create: if isMember(hid)
        && request.resource.size < 20 * 1024 * 1024
        && request.resource.contentType.matches('application/pdf|image/(jpeg|png|heic|webp)');
    }
    match /households/{hid}/{rest=**} { allow read: if isMember(hid); allow write: if false; }
    match /samples/{rest=**} { allow read: if true; allow write: if false; }
  }
}
```

## 10. Sample data: the Sharma household (abridged)

`households/hh_sharma`:
```json
{
  "name": "Sharma family", "country": "IN", "city": "Bengaluru", "cityTier": 1,
  "ownerUid": "uid_rahul",
  "access": {"uid_rahul": {"role": "owner", "memberId": "mem_rahul"},
             "uid_kamala": {"role": "member", "memberId": "mem_kamala"}},
  "accessUids": ["uid_rahul", "uid_kamala"],
  "version": 23, "currentPlanId": "pln_01", "safetyScore": 41,
  "rulesPackVersion": "IN_2026.10.1", "isDemo": true
}
```

Projection excerpt:
```json
{
  "members": {
    "mem_rahul":  {"name": {"value":"Rahul","source":"said"}, "relation":{"value":"self"}, "age":{"value":34}, "earning":{"value":true}},
    "mem_priya":  {"name": {"value":"Priya"}, "relation":{"value":"spouse"}, "age":{"value":32,"source":"said"}, "earning":{"value":false,"source":"inferred","assumption":"Not mentioned as working"}},
    "mem_anaya":  {"name": {"value":"Anaya"}, "relation":{"value":"child"}, "age":{"value":5}, "dependent":{"value":true}},
    "mem_suresh": {"name": {"value":"Suresh"}, "relation":{"value":"father"}, "age":{"value":62}, "conditions":{"value":[{"code":"diabetes_t2"}],"source":"said"}, "dependent":{"value":true}},
    "mem_kamala": {"name": {"value":"Kamala"}, "relation":{"value":"mother"}, "age":{"value":58}, "language":{"value":"hi"}, "dependent":{"value":true}, "linkedUid":"uid_kamala"}
  },
  "finances": {
    "takeHomeMonthlyInr": {"value":185000,"source":"said"},
    "emiMonthlyInr": {"value":28000,"source":"said"},
    "fixedSpendMonthlyInr": {"value":70000,"source":"said"},
    "emergencyFundInr": {"value":400000,"source":"said"},
    "annualIncomeInr": {"value":3000000,"source":"inferred","assumption":"Take-home ≈ 74% of gross for this band"}
  },
  "employments": {"emp_acme": {"memberId":"mem_rahul","employerName":{"value":"Acme Software"},"groupPolicyIds":["pol_gmc_acme"]}},
  "liabilities": {"lia_car": {"type":{"value":"car"},"outstandingInr":{"value":650000},"emiInr":{"value":28000},"endDate":{"value":"2029-03-31"}}},
  "assets": {
    "ast_creta":  {"type":{"value":"vehicle"},"description":{"value":"Hyundai Creta 2023"},"valueInr":{"value":1400000}},
    "ast_iphone": {"type":{"value":"device"},"description":{"value":"iPhone (2026)"},"valueInr":{"value":180000}}
  },
  "policies": {
    "pol_gmc_acme": {"insurer":{"value":"Sample Insurer A (GMC)"},"line":{"value":"health"},"subtype":{"value":"group"},"layer":{"value":"employer"},
      "insuredMemberIds":{"value":["mem_rahul","mem_priya","mem_anaya","mem_suresh","mem_kamala"]},
      "sumInsuredInr":{"value":500000,"source":"document","evidence":[{"documentId":"doc_benefits","page":2,"quote":"Family Floater Sum Insured: INR 5,00,000"}]},
      "premiumMode":{"value":"employer_paid"},"endDate":{"value":"2027-03-31"},"status":"active","employmentId":"emp_acme"},
    "pol_supertopup": {"line":{"value":"health"},"subtype":{"value":"super_top_up"},"layer":{"value":"personal"},
      "insuredMemberIds":{"value":["mem_rahul","mem_priya","mem_anaya","mem_suresh","mem_kamala"]},
      "sumInsuredInr":{"value":500000},"deductibleInr":{"value":500000},"premiumInr":{"value":14200},"premiumMode":{"value":"annual"},"endDate":{"value":"2027-06-14"}},
    "pol_lic_endow": {"line":{"value":"endowment"},"layer":{"value":"personal"},"insuredMemberIds":{"value":["mem_rahul"]},
      "sumInsuredInr":{"value":1000000},"premiumInr":{"value":48000},"premiumMode":{"value":"annual"},"endDate":{"value":"2041-08-20"}},
    "pol_motor": {"line":{"value":"motor"},"layer":{"value":"personal"},"premiumInr":{"value":21500},"premiumMode":{"value":"annual"},"endDate":{"value":"2027-01-09"}}
  }
}
```

Full persona scripts (as event lists) are in [09-demo-data-and-script.md](09-demo-data-and-script.md).

## 11. Retention, export and deletion

- **Export:** `GET /v1/households/{hid}/export` returns a ZIP: events JSON, projection, plans, actions, and uploaded files.
- **Delete:** `DELETE /v1/households/{hid}` (owner only, typed confirmation) deletes the subtree and Storage prefix via a background job; writes an audit record (no PII) to `auditLog/`.
- **Consent withdrawal:** stops processing; data deleted within the policy window stated in the privacy notice.

## 12. Future-proofing notes

- **Connectors** write the same events with `source="aa"` etc. and `actor.kind="connector"`. A `connectorLinks/{id}` collection under the household stores consent handles and fetch schedules (later).
- **Multi-country:** `country` on household and product; rules packs per country; currency field can be added to money facts (`currency: "INR"|"SGD"`) — the `Inr` suffix becomes `Minor` + currency in a v2 schema via upcasting.
- **Analytics:** Firestore → BigQuery export of `events` (with PII fields hashed) for funnel metrics.
- **Migration path:** if relational reporting becomes important, events are trivially replayable into Cloud SQL (Postgres) or AlloyDB; nothing in the domain depends on Firestore specifics except the repository layer.
