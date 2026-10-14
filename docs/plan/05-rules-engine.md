# 05 · Rules engine and calculations

**The deterministic heart of Kavach: every formula, rule, parameter and worked example that produces a rupee figure.** Package: `packages/engine` (`kavach_engine`). No I/O, no LLM. Every worked example below is a unit test, and the demo story's numbers come from these examples.

> **Status of regulatory rules.** Rules marked **VERIFY** are our best current understanding and are listed in game-plan.md §6 as facts to check before they go into the product. Each rule in the rules pack has a `status` (`verified` / `to_verify`) and a `sources[]` list. The UI shows the source on the Why panel. Do not remove a VERIFY flag without a primary source (IRDAI circular, regulation, or the policy wording itself).

---

## 1. Engine API

```python
from kavach_engine import Engine
eng = Engine(rules_pack=load_pack("IN", "2026.10.1"), catalog=load_catalog("IN"))

eng.needs(state, as_of)                 -> list[Need]
eng.cover_map(state, as_of)             -> CoverMap
eng.budget(state)                       -> Budget
eng.optimise(state, needs, budget)      -> list[Recommendation]
eng.score(cover_map)                    -> SafetyScore
eng.calendar(state, recs, start, months=12) -> Calendar
eng.plan(state, as_of)                  -> Plan          # runs all of the above
eng.diff(plan_a, plan_b)                -> PlanDiff
eng.sensitivity(state)                  -> list[Unknown] # for the question planner
eng.hospital.evaluate(ctx, estimate, room_options) -> DeskEvaluation
eng.claim.assess(letter, bill, policy_terms)       -> ClaimAssessment
```

Every function returns its result plus a `trace: list[RuleFiring]`:
```python
RuleFiring(rule_id="R-HL-001", inputs={...}, output={...}, statement="...", sources=[...], status="to_verify")
```

## 2. Rules pack format (`data/rules/IN/*.yaml`)

```yaml
pack: IN
version: 2026.10.1
effective_from: 2026-10-01
rules:
  - id: R-HL-001
    name: Proportionate deduction for room rent above limit
    statement: >
      If the room rent per day exceeds the policy's room-rent limit, the insurer may reduce
      associated medical expenses in the same proportion as eligible rent / actual rent.
      The reduction does not apply to pharmacy, consumables, implants, medical devices and diagnostics.
    params:
      excluded_heads: [pharmacy, consumables, implants, devices, diagnostics]
      icu_uses_icu_limit: true
    sources:
      - title: IRDAI Guidelines on Standardization in Health Insurance / Master Circular on Health Insurance Business (29 May 2024)
        url: TODO-primary-source
    status: to_verify
    applies_only_if: policy.terms.proportionateDeduction.applies == true
```

Policy-specific values (limits, co-pay, deductibles) always come from the **policy terms** (extracted with citations), never from the rules pack. The rules pack holds regulation-level rules, planning heuristics and thresholds.

## 3. Cover map

### 3.1 Risks and layers

| Risk code | Who it applies to | Need rule |
|---|---|---|
| `health` | every member | R-HL-010..013 |
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

### R-HL-010..013 Health needs (planning heuristic)
| Rule | Statement | Param (tier-1 city) |
|---|---|---|
| R-HL-010 | Nuclear family (self, spouse, children) needs a personal base floater | ₹10,00,000 |
| R-HL-011 | Each parent ≥ 60, or with a chronic condition, needs cover separate from the nuclear floater | ₹10,00,000 per parent pair (₹5,00,000 minimum acceptable as `partial`) |
| R-HL-012 | Employer group health counts toward need but makes the cell `contingent` | – |
| R-HL-013 | A super top-up counts only above its deductible and only if a base (any layer) covers the deductible | issue `topup_without_base` |

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

Parameters (0.20, 0.10, 3) live in the rules pack and are shown on the plan's "How we set your budget" sheet with a slider to change them (the user's override becomes a `FactStated`).

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

### Inputs
- `ctx`: patient; policies covering the patient with terms (room-rent limit, ICU limit, co-pay, proportionate deduction, deductible and type, SI remaining, sub-limits, PED status).
- `estimate`: line items by head (room, icu, nursing, surgeon, ot, doctor, pharmacy, consumables, implants, diagnostics, non_payable, other), room rent/day, days.
- `room_options`: the estimate's room plus alternatives (from the hospital tariff, user input, or the policy's eligible limit).

### Rules
| Rule | Statement | Status |
|---|---|---|
| R-HL-001 | Proportionate deduction: if rent/day > limit, associated heads × (limit / rent). Excluded heads: pharmacy, consumables, implants, devices, diagnostics | **VERIFY** (IRDAI health master circular / standardisation guidelines; and the wording's own clause) |
| R-HL-002 | ICU: same logic with ICU limit (2% of SI typical; from the wording) | **VERIFY** |
| R-HL-003 | Co-pay applies to the admissible amount after deductions | from wording |
| R-HL-004 | Sub-limits cap the matching treatment | from wording |
| R-HL-005 | Items on the non-payable list are excluded | **VERIFY** list version |
| R-HL-006 | With multiple policies, the insured may choose which policy to claim from first; the balance can be claimed from the other policy. Prefer the order that minimises out-of-pocket, then preserves the personal policy's cumulative bonus | **VERIFY** (contribution / multiple-policy clause, IRDAI regulations) |
| R-HL-007 | PED waiting: a claim for a pre-existing disease within the waiting period is not payable (max 36 months under current rules) | **VERIFY** |
| R-HL-009 | Super top-up (aggregate deductible) pays only on admissible amounts above the deductible in the policy year, counting amounts paid by other policies only if the wording says so | from wording |

### Algorithm
```
for room in room_options:
  for order in permutations(policies covering patient):         # usually ≤ 3 policies
     remaining_bill = bill(room)
     for policy in order:
        adm = admissible(remaining_bill, policy.terms, room)    # R-HL-001,002,004,005,007
        pay = min(adm × (1 − copay(policy, patient)), policy.si_remaining)   # R-HL-003
        apply deductible logic for top-ups                       # R-HL-009
        remaining_bill -= pay
     oop = remaining_bill
  choose order with min oop; tie-break: keep the personal policy's bonus (claim employer/group first)
recommend room with min oop; savings = oop(estimate room) − oop(recommended room)
askTheDesk = template questions triggered by fired rules (room downgrade availability, package rates, cashless pre-auth, implant pricing)
```

### Worked example HX-1 (the hero scene; unit test `test_hospital_hx1`)

**Context (Feb 2027):** Patient Suresh, 62, type 2 diabetes. Policies covering him:
- `pol_parents_migrated`: individual health floater for parents, migrated from the Acme GMC on 30 Nov 2026 (credit for waiting periods carried), SI ₹5,00,000, room rent 1% of SI per day (= ₹5,000), proportionate deduction applies, **co-pay 20% for insured aged 61+**.
- `pol_supertopup`: super top-up SI ₹5,00,000, aggregate deductible ₹5,00,000.

**Estimate (angioplasty, 4 days):**

| Head | Amount (₹) | Subject to proportionate deduction? |
|---|---|---|
| Room: Deluxe Single ₹9,000 × 4 | 36,000 | (room itself capped at limit) |
| Nursing & RMO ₹2,000 × 4 | 8,000 | yes |
| Surgeon / procedure fee | 1,20,000 | yes |
| Cath lab / OT charges | 40,000 | yes |
| Doctor visits | 12,000 | yes |
| Stent (implant) | 45,000 | no |
| Pharmacy & consumables | 55,000 | no |
| Diagnostics | 24,000 | no |
| Non-payable items | 6,000 | excluded entirely |
| **Total** | **3,46,000** | |

**Option A: Deluxe room at ₹9,000/day**
- Ratio = 5,000 / 9,000 = 0.5556
- Room payable = 5,000 × 4 = 20,000 (₹16,000 above limit borne by family)
- Associated heads = 8,000 + 1,20,000 + 40,000 + 12,000 = 1,80,000 → payable 1,80,000 × 5,000/9,000 = **1,00,000** (proportionate deduction ₹80,000)
- Excluded heads payable in full = 45,000 + 55,000 + 24,000 = 1,24,000
- Admissible = 20,000 + 1,00,000 + 1,24,000 = **2,44,000**
- Co-pay 20% = 48,800 → policy pays **1,95,200**
- Super top-up: admissible below ₹5L aggregate deductible → pays 0
- **Out-of-pocket = 3,46,000 − 1,95,200 = ₹1,50,800**

**Option B: Room at ₹5,000/day (within limit)**
- Bill = 3,46,000 − 36,000 + 20,000 = 3,30,000 (assumes the hospital's other charges don't change with room category; see note)
- Admissible = 20,000 + 1,80,000 + 1,24,000 = **3,24,000**
- Co-pay 20% = 64,800 → policy pays **2,59,200**
- **Out-of-pocket = 3,30,000 − 2,59,200 = ₹70,800**

**Result:** Recommend Option B, saving **₹80,000**. Which policy first: the parents' policy; the super top-up only starts after ₹5,00,000 of admissible claims in the policy year, so keep every bill and discharge summary for it.

**Note on room-linked tariffs:** many hospitals price procedures by room category, so Option B's other charges may actually be *lower*. The engine assumes unchanged charges (conservative) and adds an "ask the desk" question: "Are procedure and doctor charges different for the ₹5,000 room?"

**Spoken answer (Hindi, from tool results only):** *"Pehle parents wali policy ka card TPA desk par dijiye. ₹9,000 wala room lene se poore bill par katauti hogi — lagbhag ₹80,000 zyada aapko dene padenge. ₹5,000 wala room maangiye; tab aapka kharcha lagbhag ₹70,800 hoga. Sign karne se pehle TPA desk se confirm kar lijiye."*

**Ask the desk (cards):**
1. "Is a room at ₹5,000 per day or less available?"
2. "Will the surgeon and cath lab charges change with the room?"
3. "Please start cashless pre-authorisation with the parents' policy."

## 10. Claim assessment (moment 3)

### Rules
| Rule | Check | Verdict logic |
|---|---|---|
| R-CLM-001 | Proportionate deduction applied when room rent was within limit | challengeable |
| R-CLM-002 | Proportionate deduction applied to excluded heads (pharmacy, implants, diagnostics, consumables) | challengeable (**VERIFY** R-HL-001) |
| R-CLM-003 | Item deducted as non-payable but not on the non-payable list / covered by wording | challengeable |
| R-CLM-004 | Consumables deducted where the wording has no consumables cover | valid if item is on non-payable list; else possibly |
| R-CLM-005 | Co-pay computed on the correct base and at the correct rate | challengeable if base/rate wrong |
| R-CLM-006 | Deduction reason vague ("as per policy terms") with no clause | possibly; ask insurer for the clause |
| R-CLM-007 | Grievance timeline: insurer must respond within the regulatory period; escalate to Bima Bharosa / Insurance Ombudsman if unresolved or rejected | **VERIFY** periods (commonly cited: insurer reply within 14 days; ombudsman complaint after insurer reply or 30 days, within 1 year) |

### Worked example CX-1 (unit test `test_claim_cx1`)

Settlement letter (sample, March 2027): Bill ₹3,30,000 (Option B room). Approved ₹2,44,640. Deductions:

| # | Letter says | Amount (₹) | Engine verdict | Why |
|---|---|---|---|---|
| 1 | Non-payable items (registration, toiletries, attendant food) | 6,000 | **Valid** | Items on the non-payable list (R-HL-005) |
| 2 | "Proportionate deduction as room rent exceeds eligibility" | 9,600 | **Challengeable** | Room was ₹5,000/day = 1% of SI, within the limit (R-CLM-001), and it was applied to pharmacy/diagnostics (R-CLM-002) |
| 3 | Consumables (gloves, PPE kit, syringes) | 8,600 | **Possibly** | Some consumables are payable as part of the procedure; check wording clause on consumables (R-CLM-004) |
| 4 | Co-pay 20% | 61,160 | **Valid rate**, base recomputed | 20% × (3,30,000 − 6,000 − 9,600 − 8,600) = 61,160 (R-CLM-005) |

- Approved = 3,05,800 − 61,160 = 2,44,640 ✔ (matches letter).
- If item 2 is reversed: +9,600 × 0.8 = **₹7,680** clearly recoverable.
- If item 3 is also reversed: +8,600 × 0.8 = **₹6,880** possibly recoverable.
- **Up to ₹14,560 recoverable**; engine-expected settlement was ₹2,59,200 (HX-1 option B).

Appeal letter: addressed to the insurer's Grievance Redressal Officer; items 2 and 3; clauses quoted; request for ₹14,560 with a written response.

## 11. Worked example PX-1: Sharma plans before and after the job change (unit tests `test_plan_px1_*`)

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

**Life change (recorded 10 Nov 2026):** "Joining a startup on 1 Dec." → `EmploymentEnded(emp_acme, 2026-11-30)`; `EmploymentStarted(emp_startup, 2026-12-01)`; startup GMC (from offer letter, if uploaded, else asked): ₹3L, employee + spouse + children only.

**Cover map as of 1 Dec 2026 (no action):** parents' health → `gap` (Acme GMC ended; super top-up has no base → issue `topup_without_base`); nuclear family health → `contingent` on the startup GMC ₹3L.

**Plan v2 (as of 1 Dec 2026):**
- Selected: term ₹4 Cr (4,000), family floater ₹10L (1,833), PA ₹50L (417), **parents' health ₹5L via group-to-individual migration (4,167)** → **₹10,417/mo** ≤ ₹10,425.
- Deferred: device protection (−₹750/mo), reason: budget; lowest weight.
- Dated actions: "By 15 Nov: ask Acme's insurer/HR for migration of Suresh and Kamala to an individual policy (window **VERIFY**, commonly 30–45 days before group cover ends)"; "30 Nov: last day of Acme cover"; "1 Dec: send startup HR the family details for their GMC".

**Diff v1 → v2:** + Parents' health ₹5L (₹4,167/mo); − Device protection (₹750/mo, deferred); monthly protection spend ₹7,000 → ₹10,417; safety score values are whatever R-SC-001 yields on the fixture, recorded in the test and copied into the video script (do not hand-type them).

## 12. Sensitivity (question planner input)

`eng.sensitivity(state)` perturbs each unknown/inferred fact across its plausible range and measures the change in total recommended ₹ and in the safety score. Output: unknowns ranked by `|Δ plan ₹| × uncertainty`. The top ≤ 3 become questions; Flash only words them.

Typical top unknowns for the Sharmas: "Is Priya earning?" (changes life need), "Do your parents live with you / depend on you?" (changes parents' health priority), "Does Acme's policy cover your parents?" (if the benefits document is missing).

## 13. Testing the engine

- `pytest` unit tests for every rule with the worked examples above (HX-1, CX-1, PX-1) as golden tests.
- `hypothesis` property tests: out-of-pocket ≥ 0; insurer pay ≤ SI remaining; proportionate deduction never applied when rent ≤ limit; adding a policy never increases OOP; budget never exceeded by selected recommendations.
- Each `RuleFiring` must include `sources`; a test fails if any rule lacks a source or a status.
- Coverage target: 95% lines on `kavach_engine`.
