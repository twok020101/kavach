# 05 · Rules engine and calculations

> Updated 16 Oct 2026 to match red-team-response.md and implementation-plan.md.

**The deterministic heart of Kavach: every formula, rule, parameter and worked example that produces a rupee figure.** Package: `packages/engine` (`@kavach/engine`, pure TypeScript). No I/O, no LLM. Every worked example below is in `packages/engine/src/examples.ts` and checked by `pnpm --filter @kavach/engine check`, and the demo story's numbers come from these examples.

> **Status of regulatory rules.** Rules marked **VERIFY** are our best current understanding and are listed in game-plan.md §6 and red-team-response.md §4 ("Rules still unverified") as facts to check before they go into the product. Each rule has a `status` (`verified` / `to_verify`) and a `sources[]` list. The UI shows the source on the Why panel and "Check with your insurer" only on rules still `to_verify`. Do not remove a VERIFY flag without a primary source (IRDAI circular, regulation, or the policy wording itself); a person, not an agent, flips it. **None of the hero's rules may remain `to_verify` at gate G1** (implementation-plan.md §11).

---

## 1. Engine API

```ts
import { evaluateHospital, assessClaim, buildDeskSay, formatInr, RULES } from '@kavach/engine';

evaluateHospital(ctx: HospitalContext, estimate: HospitalEstimate, roomOptions?: RoomCategory[]) => DeskEvaluation
assessClaim(letter: SettlementLetter, bill, terms)                                             => ClaimAssessment
buildDeskSay(evaluation, locale)                                                               => string   // the spoken line
formatInr(150800)                                                                              => "₹1,50,800"

// moment 1 and the cover map (WP-9):
needs(household, asOf) · coverMap(household, asOf) · budget(household) · optimise(household, needs, budget)
score(coverMap) · calendar(household, recs, start, months = 12) · plan(household, asOf) · diff(planA, planB)
sensitivity(household)                                                                          // for the question planner
```

Inputs and outputs are the Zod types in `packages/schemas` (`HospitalEstimate`, `DeskEvaluation`, `SettlementLetter`, `ClaimAssessment`, `Household`). Every function returns its result plus a `trace: RuleFiring[]`:
```ts
{ ruleId: "R-HL-001", statement: "...", inputs: {...}, output: {...}, status: "to_verify", sources: [...] }
```

Money is integer rupees with one explicit rounding rule (`money.ts`). The same package runs in the API and in the browser (instant room comparison and Why panel).

**`say`.** `buildDeskSay` builds the spoken line from the evaluation, with amounts in Indian digits for captions (₹1,50,800) and in Hindi words for speech ("ek lakh pachaas hazaar aath sau"), so no agent ever composes a number.

## 2. Rules format

Rules are code: `packages/engine/src/rules.ts` holds each rule's `id`, `name`, `statement`, `status` and `sources`, and `data/rules/IN/README.md` is the human-readable copy (keep the two in step; the code is the source of truth).

```ts
{
  id: 'R-HL-001',
  name: 'Proportionate deduction only on room-priced heads',
  statement: 'If room rent per day is above the limit and the hospital bills by room category, only the heads the tariff prices by room category are reduced by limit / actual rent. Pharmacy, consumables, implants, devices, diagnostics and ICU are never reduced.',
  status: 'to_verify',
  sources: [IRDAI_2020_CIRCULAR, IRDAI_2024_MASTER_CIRCULAR],
}
```

Sources: [S1] IRDAI circular IRDAI/HLT/REG/CIR/151/06/2020 (proportionate deductions), as quoted in insurers' filed wordings; [S2] IRDAI Master Circular on Health Insurance Business, 29 May 2024 (paragraph numbers still to be copied by a person); [W] the policy's own wording.

Policy-specific values (limits, co-pay, deductibles) always come from the **policy terms** (extracted with citations), never from the rules. The rules hold regulation-level rules, planning heuristics and thresholds.

## 3. Cover map

### 3.1 Risks and layers

| Risk code | Who it applies to | Need rule |
|---|---|---|
| `health` | every member | R-HN-001..004 |
| `life` (income replacement) | each earning member | R-LF-001 |
| `accident` (disability/death by accident) | each earning member | R-PA-001 |
| `vehicle` | each vehicle asset | R-MT-001 |
| `device` | each device ≥ threshold | R-DV-001 |
| `travel` | members on a planned international trip | R-TR-001 |

Layers: `statutory` (government schemes), `employer`, `personal`. Each cell lists the policies by layer.

### 3.2 Cell status

| Status | Rule | Colour token |
|---|---|---|
| `covered` | existing personal+statutory cover ≥ 90% of need and no blocking issue | `--status-safe` |
| `contingent` | need is met only with employer cover (would fail if job ends) | `--status-partial` with briefcase icon |
| `partial` | 30–90% of need met, or a blocking issue (e.g. super top-up without a base, PED waiting not served) | `--status-partial` |
| `gap` | < 30% of need met | `--status-gap` |
| `na` | risk does not apply | `--status-na` |

Each cell: `{ memberId, risk, status, needInr, haveInr: {statutory, employer, personal}, gapInr, issues[], policyIds[], ruleIds[] }`.

## 4. Needs

### R-LF-001 Term life need (planning heuristic, not regulation)
```
need = annual_income × M(age) + outstanding_liabilities + child_goals − liquid_assets − existing_pure_life_cover
M(age): <40 → 12, 40–49 → 10, 50–59 → 8, ≥60 → 0 (no new need)
child_goals: ₹25,00,000 per dependent child under 18 (education reserve, rules-pack param)
liquid_assets: emergency_fund + gold (if given)
existing_pure_life_cover: term + employer group term life (contingent) + endowment/ULIP sum assured
recommend: round UP to the next ₹25,00,000
```
R-LF-002: endowment/ULIP plans count at sum assured but add an issue `savings_plan_not_term` ("This is mainly a savings plan; its life cover is ₹10L").

### R-HN-001..004 Health needs (planning heuristic)

(Renumbered from R-HL-010..013, because R-HL-010 is now the hospital billing-type rule in §9.)

| Rule | Statement | Param (tier-1 city) |
|---|---|---|
| R-HN-001 | Nuclear family (self, spouse, children) needs a personal base floater | ₹10,00,000 |
| R-HN-002 | Each parent ≥ 60, or with a chronic condition, needs cover separate from the nuclear floater | ₹10,00,000 per parent pair (₹5,00,000 minimum acceptable as `partial`) |
| R-HN-003 | Employer group health counts toward need but makes the cell `contingent` | – |
| R-HN-004 | A super top-up counts only above its deductible and only if a base (any layer) covers the deductible | issue `topup_without_base` |

Tier-2/3 values: ₹7,50,000 and ₹5,00,000 (rules-pack params).

### R-PA-001 Personal accident
`need = min(annual_income × 3, ₹1,00,00,000)` for each earner; recommend ₹50,00,000 minimum when income ≥ ₹15L.

### R-MT-001 Motor
Third-party cover is mandatory under the Motor Vehicles Act (**VERIFY wording**). Comprehensive (own damage) recommended for vehicles with value ≥ ₹3,00,000 or with a loan outstanding.

### R-DV-001 Device
Recommend device protection for devices worth ≥ ₹50,000 in their first 2 years. Low priority (weight 0.2).

### R-TR-001 Travel
International trip → travel medical cover for each traveller; for Schengen visas a minimum of €30,000 medical cover is a visa requirement (**VERIFY**).

## 5. Budget

### R-BG-001 Monthly protection budget (planning heuristic)
```
disposable = take_home − emi − fixed_spend
budget_total = min(0.20 × disposable, 0.10 × take_home)
existing_personal_premiums_monthly = Σ annualised personal premiums / 12   (employer-paid excluded)
budget_for_new = max(0, budget_total − existing_personal_premiums_monthly)
```
If `emergency_fund < 3 × (emi + fixed_spend)`, add issue `thin_emergency_fund` and prefer lower-deductible options.

Parameters (0.20, 0.10, 3) live in the rules pack and are shown on the plan's "How we set your budget" sheet with a slider to change them (the user's override is saved as a stated fact on the household).

## 6. Optimiser

### R-OP-001 Greedy by weighted gap closed per rupee
```
for each candidate recommendation r (from catalog categories matching gaps):
    value(r) = Σ over cells closed: weight(risk, member) × gap_closed_inr
    efficiency(r) = value(r) / monthly_premium(r)
sort by (urgency desc, efficiency desc)
select while Σ monthly_premium ≤ budget_for_new
unselected → deferred with reason (budget | lower priority | not urgent while employer cover lasts)
```
Weights: life of primary earner 1.0; health of seniors 0.9; health of nuclear family 0.8; accident 0.5; vehicle own-damage 0.4; device 0.2; travel 0.6 (urgent if trip < 60 days).
Urgency: `gap` cells with an effective date within 60 days = 2; `gap` = 1; `contingent` = 0.5 (becomes 2 if a job change is planned).

Indicative premiums come from `catalog/` tables (illustrative, labelled as such on every screen).

## 7. Safety score

### R-SC-001
```
score = round(100 × Σ_cells weight × min(1, (have_personal + have_statutory + 0.5 × have_employer) / need)
               / Σ_cells weight)
```
Employer cover counts half because it is contingent. `na` cells excluded.

## 8. Premium calendar

### R-CL-001
Expand each personal policy and each accepted recommendation into due dates for the next 12 months by mode (annual, half-yearly, quarterly, monthly). Modal loading for non-annual modes from the catalog (e.g. monthly ≈ +4–5%, rules-pack param). Spike month = month total > 2 × median month. `set_aside_monthly = ceil(Σ annual / 12 / 100) × 100`.

## 9. Hospital evaluation (moment 2)

### What the rule actually says (checked 16 Oct 2026)

Proportionate deduction may be applied **only to charges the hospital bills differently by room category**, and only at hospitals that follow differential billing. It is **never** applied to ICU charges (ICUs don't come in room categories), or to pharmacy, consumables, implants, medical devices or diagnostics. Source: IRDAI circular IRDAI/HLT/REG/CIR/151/06/2020 as reproduced in insurers' filed wordings; the 29 May 2024 master circular is reported to keep it (paragraph number still to be copied). See red-team-response.md §3.

### Inputs
- `ctx` (`HospitalContext`): patient; policies covering the patient with terms (room-rent limit, ICU limit, co-pay and the age it starts at, proportionate deduction, deductible, SI remaining, claims used this year).
- `estimate` (`HospitalEstimate`): the **room-category tariff**: room categories with rent/day, and every line item with its amount in each category and `pricedByRoom`; `billingType ∈ {differential, flat, package, unknown}`; `packagePrices` when quoted; days.
- `roomOptions`: the categories printed on the tariff, plus any the user adds, plus the policy's eligible limit.

### Rules
| Rule | Statement | Status |
|---|---|---|
| R-HL-001 | Proportionate deduction: if rent/day > limit **and the hospital bills by room category**, only the heads the tariff prices by room category are reduced by (limit / rent). Never pharmacy, consumables, implants, devices, diagnostics or ICU | **VERIFY** paragraph number in [S2]; confirmed on [S1] and filed wordings |
| R-HL-002 | **ICU charges are never proportionately deducted.** ICU rent is still capped at the wording's ICU limit, if it has one, but nothing else is cut because of it (replaces the old "same logic with ICU limit") | **VERIFY** paragraph number in [S2]; confirmed on [S1] |
| R-HL-003 | Co-pay applies to the admissible amount after deductions | from wording |
| R-HL-004 | Sub-limits cap the matching treatment | from wording |
| R-HL-005 | Items on the non-payable list are excluded | **VERIFY** list version |
| R-HL-006 | With multiple policies, the insured may choose which policy to claim from first; the balance can be claimed from the other policy. Kavach picks the order with the lowest out-of-pocket (ties: employer cover first, super top-up last) | **VERIFY** in [S2] |
| R-HL-007 | PED waiting: a claim for a pre-existing disease within the waiting period is not payable (max 36 months under current rules) | **VERIFY** |
| R-HL-008 | Room rent above the per-day limit is not admissible; the excess is paid by the family | from wording |
| R-HL-009 | Super top-up (aggregate deductible) pays only on admissible amounts above the deductible in the policy year; amounts paid by other policies count toward it where the wording says so | from wording |
| R-HL-010 | **Billing type unknown:** compute **both** branches (differential and flat) and return one `questionForDesk` ("Are the surgeon, cath lab and nursing charges different for the ₹5,000 room?") before giving a single number | verified (logic) |
| R-HL-014 | **Package rate:** apply no ratio or cap; ask the desk for the package price in the room within the limit and tell the family to confirm with the TPA desk | verified (logic) |

### Algorithm
```
branches = billingType == unknown ? [differential, flat] : [billingType]           # R-HL-010
if billingType == package: return question for the package price in the eligible room   # R-HL-014
for branch in branches:
  for room in roomOptions:
    bill = Σ line.amounts[room]                                                      # the tariff column
    for order in permutations(policies covering patient):                            # usually ≤ 3 policies
       remaining = bill
       for policy in order:
          adm = admissible(lines, room, policy.terms, branch)
              # R-HL-005 drop non-payables; R-HL-008 cap room at the limit;
              # R-HL-001 if branch == differential and rent > limit: room-priced heads × limit/rent;
              # R-HL-002 ICU only capped at its own limit; R-HL-004, R-HL-007
          pay = min(adm − copay(policy, patient), policy.siRemaining)                 # R-HL-003
          apply deductible logic for top-ups                                         # R-HL-009
          remaining -= pay
       oop = remaining
    choose order with min oop                                                        # R-HL-006
  recommend room with min oop; saving = oop(priciest room) − oop(recommended room)
say = buildDeskSay(evaluation, locale)
```

### Worked example HX-1 (the hero scene; `examples.ts` HX-1 differential / flat / unknown / package)

**Context (Feb 2027):** Suresh's angioplasty is **planned** for Monday at City Heart Hospital, Bengaluru. Patient Suresh, 62, type 2 diabetes. Policies covering him:
- `pol_parents_migrated`: individual health floater for parents, migrated from the Acme GMC on 30 Nov 2026 (credit for waiting periods carried), SI ₹5,00,000, room rent 1% of SI per day (= ₹5,000), proportionate deduction applies, **co-pay 20% for insured aged 61+**.
- `pol_supertopup`: super top-up SI ₹5,00,000, aggregate deductible ₹5,00,000.

**Estimate (planned angioplasty, 4 days).** The printed estimate carries the hospital's **room-category tariff**, which is common in Indian private hospitals and is exactly what Gemini reads from the photo (`data/samples/city-heart-estimate.png`):

| Head | Deluxe ₹9,000 (Option A) | Single Standard ₹5,000 (Option B) | Priced by room? |
|---|---:|---:|---|
| Room × 4 days | 36,000 | 20,000 | – |
| Nursing & RMO × 4 | 8,000 | 6,000 | yes |
| Surgeon / procedure | 1,20,000 | 90,000 | yes |
| Cath lab / OT | 40,000 | 26,000 | yes |
| Doctor visits | 12,000 | 8,000 | yes |
| Stent (implant) | 45,000 | 45,000 | no |
| Pharmacy & consumables | 55,000 | 55,000 | no |
| Diagnostics | 24,000 | 24,000 | no |
| Non-payable items | 6,000 | 6,000 | excluded |
| **Bill** | **3,46,000** | **2,80,000** | |

**Option A: Deluxe room at ₹9,000/day** (differential billing)
- Ratio = 5,000 / 9,000
- Room payable = 5,000 × 4 = 20,000 (₹16,000 above the limit borne by the family; R-HL-008)
- Room-priced heads = 8,000 + 1,20,000 + 40,000 + 12,000 = 1,80,000 → payable 1,80,000 × 5,000/9,000 = **1,00,000** (proportionate deduction **₹80,000**, legal here because these heads are priced by room; R-HL-001)
- Other heads payable in full = 45,000 + 55,000 + 24,000 = 1,24,000
- Admissible = 20,000 + 1,00,000 + 1,24,000 = **2,44,000**
- Co-pay 20% = 48,800 → policy pays **1,95,200**
- Super top-up: admissible below the ₹5L aggregate deductible → pays 0
- **Out-of-pocket = 3,46,000 − 1,95,200 = ₹1,50,800**

**Option B: Single Standard at ₹5,000/day (within the limit)**
- Bill = **2,80,000** (the room-priced heads come down with the room)
- Admissible = 20,000 + 1,30,000 + 1,24,000 = **2,74,000** (no deduction: rent is within the limit)
- Co-pay 20% = 54,800 → policy pays **2,19,200**
- **Out-of-pocket = 2,80,000 − 2,19,200 = ₹60,800**

**Result:** Recommend Option B, **₹90,000 less to pay**. Of that, ₹66,000 is the lower bill and the rest is the deduction and room excess Kamala avoids, partly offset by a higher co-pay on the larger approved amount. The Why panel shows this split. Which policy first: the parents' policy; the super top-up only starts after ₹5,00,000 of admissible claims in the policy year.

**Branch: the hospital doesn't bill by room** (`flat`, or the desk's answer to the R-HL-010 question). No deduction on the procedure heads, and every head except the room costs the same in both rooms:
- Option A: bill 3,46,000; admissible 3,24,000 (non-payables out, room capped at 20,000); co-pay 64,800; policy pays 2,59,200; **out-of-pocket ₹86,800**.
- Option B: bill 3,30,000; admissible 3,24,000; policy pays 2,59,200; **out-of-pocket ₹70,800**.
- Saving: only the **₹16,000** room difference. Kavach says this out loud instead of inventing a bigger number.

**Branch: billing type unknown** (R-HL-010): the engine returns both branches above (`primary` and `alternate`) and `questionForDesk`; the agent asks the desk before giving one number. The Why panel shows both for two seconds in the video.

**Branch: package rate** (R-HL-014): no ratio applied; Kavach asks for the package price in the ₹5,000 category and tells Kamala to confirm with the TPA desk.

**Spoken answer (Hindi, built by `say` from engine output):** *"Pehle parents wali policy ka card TPA desk par dijiye. ₹9,000 wale room mein doctor aur operation ke charges bhi zyada hain, aur insurance unpar katauti karega. Aapko lagbhag ₹1,50,800 dene padenge. ₹5,000 wala room maangiye, tab lagbhag ₹60,800. Sign karne se pehle TPA desk se confirm kar lijiye."*

**Super top-up (one spoken line, no card):** *"Top-up policy tabhi kaam aayegi jab is saal ka kharcha ₹5 lakh se upar jaaye, isliye saare bill sambhal kar rakhiye."*

**Ask the desk (cards):**
1. "Is a room at ₹5,000 per day or less available?"
2. Only when billing is unknown: "Are the surgeon, cath lab and nursing charges different for the ₹5,000 room?"
3. "Please start cashless pre-authorisation with the parents' policy."

## 10. Claim assessment (moment 3)

### Rules
| Rule | Check | Verdict logic |
|---|---|---|
| R-CLM-001 | Proportionate deduction applied when room rent was within limit | challengeable |
| R-CLM-002 | Proportionate deduction applied to excluded heads (pharmacy, implants, devices, diagnostics, consumables) | challengeable (**VERIFY** with R-HL-001) |
| R-CLM-003 | Item deducted as non-payable but not on the non-payable list / covered by wording | challengeable |
| R-CLM-004 | Consumables deducted where the wording has no consumables cover | valid if item is on non-payable list; else possibly |
| R-CLM-005 | Co-pay computed on the correct base and at the correct rate | challengeable if base/rate wrong |
| R-CLM-006 | Deduction reason vague ("as per policy terms") with no clause | possibly; ask insurer for the clause |
| R-CLM-007 | Grievance timeline: insurer must respond within the regulatory period; escalate to Bima Bharosa / Insurance Ombudsman if unresolved or rejected | **VERIFY** periods (commonly cited: insurer reply within 14 days; ombudsman complaint after insurer reply or 30 days, within 1 year); until verified, show "within the regulatory period" without days |
| R-CLM-008 | Proportionate deduction applied **to ICU charges**, or at a hospital **without differential billing** | challengeable (**VERIFY** paragraph number in [S2]) |

Recoverable amount for a challengeable or possibly deduction = the deduction × (1 − co-pay rate).

### Worked example CX-1 (`examples.ts` CX-1)

Settlement letter (sample, March 2027, `data/samples/suraksha-settlement-letter.png`): Bill **₹2,80,000** (Option B room). Approved **₹2,04,640**. Deductions:

| # | Letter says | Amount (₹) | Engine verdict | Why |
|---|---|---|---|---|
| 1 | Non-payable items (registration, toiletries, attendant food) | 6,000 | **Valid** | Items on the non-payable list (R-HL-005) |
| 2 | "Proportionate deduction as room rent exceeds eligibility" | 9,600 | **Challengeable** | Room was ₹5,000/day = 1% of SI, within the limit (R-CLM-001) |
| 3 | Consumables (gloves, PPE kit, syringes) | 8,600 | **Possibly** | Some consumables are payable as part of the procedure; check wording clause on consumables (R-CLM-004) |
| 4 | Co-pay 20% | 51,160 | **Valid rate**, base recomputed | 20% × (2,80,000 − 6,000 − 9,600 − 8,600) = 20% × 2,55,800 = 51,160 (R-CLM-005) |

- Approved = 2,55,800 − 51,160 = 2,04,640 ✔ (matches letter).
- If item 2 is reversed: +9,600 × 0.8 = **₹7,680** clearly recoverable.
- If item 3 is also reversed: +8,600 × 0.8 = **₹6,880** possibly recoverable.
- **Up to ₹14,560 recoverable**, and ₹2,04,640 + ₹14,560 = ₹2,19,200, the engine's expected payout in HX-1 Option B. Everything ties out.

Appeal letter: addressed to the insurer's Grievance Redressal Officer; items 2 and 3; clauses quoted; request for ₹14,560 with a written response.

## 11. Worked example PX-1: Sharma plans before and after the job change (added to `examples.ts` with moment 1)

Inputs (Oct 2026): take-home ₹1,85,000/mo; EMIs ₹28,000; fixed spend ₹70,000; emergency fund ₹4,00,000; annual income ₹30,00,000 (inferred). Existing personal premiums: super top-up ₹14,200 + LIC endowment ₹48,000 + motor ₹21,500 = ₹83,700/yr = **₹6,975/mo**.

**Budget (R-BG-001):** disposable = 1,85,000 − 28,000 − 70,000 = 87,000. Budget total = min(17,400, 18,500) = **₹17,400/mo**. Budget for new = 17,400 − 6,975 = **₹10,425/mo**.

**Life need (R-LF-001):** 30,00,000 × 12 + 6,50,000 (car loan) + 25,00,000 (Anaya) − 4,00,000 (emergency fund) − 10,00,000 (endowment SA) = **₹3,77,50,000 → recommend ₹4 Cr term**.

Indicative premiums (illustrative catalog):

| Category | Size | ₹/yr | ₹/mo |
|---|---|---|---|
| Term life (Rahul, 34, to age 65) | ₹4 Cr | 48,000 | 4,000 |
| Family floater health (Rahul, Priya, Anaya) | ₹10L | 22,000 | 1,833 |
| Personal accident (Rahul) | ₹50L | 5,000 | 417 |
| Device protection (iPhone) | ₹1.8L | 9,000 | 750 |
| Parents' own health (via migration from GMC) | ₹5L | 50,000 | 4,167 |

**Plan v1 (as of 14 Oct 2026, employed at Acme):**
- Selected: term ₹4 Cr, family floater ₹10L, PA ₹50L, device → **₹7,000/mo** of ₹10,425.
- Deferred: parents' own health cover — reason: "Covered by Acme's group policy for now. Becomes urgent if Rahul changes jobs." (Parents' health cells are `contingent`.) Adding it would take the total to ₹11,167, over budget.

**Life change (recorded 10 Nov 2026):** "Joining a startup on 1 Dec." → Acme GMC `endDate` set to 2026-11-30; startup GMC (Orbit Labs, from the offer letter if uploaded, else asked) from 2026-12-01: ₹3L, employee + spouse + children only; timeline entry `life_change`.

**Cover map as of 1 Dec 2026 (no action):** parents' health → `gap` (Acme GMC ended; super top-up has no base → issue `topup_without_base`); nuclear family health → `contingent` on the startup GMC ₹3L.

**Plan v2 (as of 1 Dec 2026):**
- Selected: term ₹4 Cr (4,000), family floater ₹10L (1,833), PA ₹50L (417), **parents' health ₹5L via group-to-individual migration (4,167)** → **₹10,417/mo** ≤ ₹10,425.
- Deferred: device protection (−₹750/mo), reason: budget; lowest weight.
- Dated actions: "By 15 Nov: ask Acme's insurer/HR for migration of Suresh and Kamala to an individual policy (window **VERIFY**; the sample Acme benefits summary §9.1 says 15 days before cover ends; keep \"check with HR\" on screen until verified)"; "30 Nov: last day of Acme cover"; "1 Dec: send startup HR the family details for their GMC". The 15 Nov action is also sent as a **WhatsApp nudge** to Rahul ("15 Nov: ask Acme HR to migrate Mummy and Papa's cover. The letter is ready, reply YES to send it to you as a PDF.").

**Diff v1 → v2:** + Parents' health ₹5L (₹4,167/mo); − Device protection (₹750/mo, deferred); monthly protection spend ₹7,000 → ₹10,417; safety score values are whatever R-SC-001 yields on the fixture, recorded in the test and copied into the video script (do not hand-type them).

## 12. Sensitivity (question planner input)

`sensitivity(household)` perturbs each unknown/inferred fact across its plausible range and measures the change in total recommended ₹ and in the safety score. Output: unknowns ranked by `|Δ plan ₹| × uncertainty`. The top ≤ 3 become questions; Flash only words them.

Typical top unknowns for the Sharmas: "Is Priya earning?" (changes life need), "Do your parents live with you / depend on you?" (changes parents' health priority), "Does Acme's policy cover your parents?" (if the benefits document is missing).

## 13. Checking the engine

No unit-test suite during the hackathon (Kshitij's rule); the engine is checked by running it.

- `pnpm --filter @kavach/engine check` (`scripts/check-examples.ts`) runs every worked example above and fails loudly if any number differs: HX-1 differential (₹1,50,800 / ₹60,800, saving ₹90,000, Deluxe deduction ₹80,000), HX-1 flat (₹86,800 / ₹70,800, saving ₹16,000), HX-1 unknown (both branches + one question), HX-1 package (no ratio, asks the price), ICU never deducted, CX-1 (approved ₹2,04,640, recoverable ₹14,560 = ₹7,680 + ₹6,880, expected payout ₹2,19,200), and PX-1 once moment 1 lands.
- Invariants to keep true (asserted in the check script where an example exercises them): out-of-pocket ≥ 0; insurer pay ≤ SI remaining; proportionate deduction never touches excluded heads or ICU, and never applies when rent ≤ limit or billing is flat; adding a policy never increases OOP; budget never exceeded by selected recommendations.
- Every rule in `rules.ts` carries `sources` and a `status`, and each `RuleFiring` copies them.
