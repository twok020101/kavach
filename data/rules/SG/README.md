# Kavach rules pack: Singapore (SG)

Human-readable copy of the Singapore rules in `packages/engine/src/rules.ts` and the figures in
`packages/engine/src/hospital-sg.ts` (`MEDISHIELD_LIFE`). The code is the source of truth; keep
the two in step. Plan-specific values (ward entitlement, the plan's pro-ration, deductible,
co-insurance, rider cap and conditions) always come from the plan's own terms, never from this pack.

**Status:** `to_verify` means a human still has to open the primary page and confirm the figure
and its effective date. Kavach shows "Check with your insurer" on rules in that state. A person
(not an agent) flips a rule to `verified`.

**Sources**

- [R] `source/Singapore_Health_Insurance_Rulebook.docx` and `source/Singapore_Health_Insurance_Rules.xlsx`:
  an 82-rule audit rulebook compiled on 18 Oct 2026 from MAS, MOH, CPF Board, SSO/AGC, LIA, GIA,
  FIDReC and SDIC primary sources, with a verification status per rule. Rule ids SG-xxx-nn below
  refer to it. It is the quickest way to find the primary page for any figure here.
- [M1] MOH, MediShield Life benefits: claim limits for admissions on or after 1 June 2026
- [M2] CPF Board, MediShield Life pro-ration factors for admissions on or after 1 April 2025
  (SG-MSHL-04; prescribed in the MediShield Life Scheme Regulations 2015, Fourth Schedule)
- [M3] MOH, "How to make a MediShield Life claim", Tables I (deductible) and J (co-insurance),
  updated 1 June 2026 (SG-MSHL-02, SG-MSHL-03); S 622/2015 reg 13
- [M4] MOH press release, 26 Nov 2025: new requirements for Integrated Shield Plan riders, Annex A
  (SG-RID-01..05); MOH PQ answer 26 Feb 2021 (minimum 5% co-payment)
- [M5] FIDReC Terms of Reference v2.2, 1 July 2025 (SG-FID-01..04)
- [W] The plan's own terms

Singapore has no IRDAI-style master circular: the rules sit in the Insurance Act, the MediShield
Life Scheme Act and Regulations, MAS Notice 120, MOH's IP and rider design requirements and
LIA/GIA guidelines ([R] §2). The closest thing to proportionate deduction is MediShield Life
pro-ration; no rule limits which bill items may be pro-rated, and IP-level pro-ration is set by
each insurer (SG-IP-02, unverified).

## MediShield Life figures carried by the engine (dated 18 Oct 2026)

| Figure                         | Value                                                                                                        | Source |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------ |
| Daily ward charges             | $830 a day, plus $800 a day for the first two inpatient days                                                 | M1     |
| ICU                            | $5,140 a day                                                                                                 | M1     |
| Policy-year limit              | $200,000 (admissions from 1 Apr 2025); no lifetime limit                                                     | M1, M3 |
| Pro-ration, Singapore Citizens | Ward charges: C and B2 100 %, B1 34 %, A 27 %, private 16 %; surgical: 35 %, 25 %, 10 %                      | M2     |
| Deductible, age 80 and below   | Class C $2,000; Class B1 and B2 $2,500; Class A and private hospitals $3,500                                 | M3     |
| Deductible, age 81 and above   | Class C $2,750; Class B1 and B2 $3,500; Class A and private hospitals $4,500                                 | M3     |
| Co-insurance (inpatient)       | 10 % to $5,000, 5 % from $5,000 to $10,000, 3 % above, on the year's claimable amount incl. the deductible   | M3     |
| MOH minimum IP deductible      | C $1,500; B2 $2,000; B1 $2,500; A and private $3,500, the lower of the plan's target class and the ward used | M4     |

MOH has announced a second step of the inpatient deductibles on 1 Apr 2027; the amounts are not
published yet ([R] SG-MSHL-02 note). Not modelled: Permanent Resident and foreigner factors, day
surgery, outpatient (and its $500 deductible), surgical-table limits, the Cancer Drug List,
MediSave (which pays the family's share, it does not reduce it).

## Hospital desk (`evaluateHospitalSg`)

| Rule     | What it says                                                                                                                      | Status    | Sources |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| R-SG-001 | MediShield Life pro-rates the bill by ward class and hospital type (ward and surgical factors) before the claim limits            | to_verify | M2, M1  |
| R-SG-002 | Daily ward and ICU charges are capped, with the first-two-days extra                                                              | to_verify | M1      |
| R-SG-003 | The deductible per policy year depends on the ward class and the age, and comes off once; a plan's is at or above the MOH minimum | to_verify | M3, M4  |
| R-SG-004 | Co-insurance is tiered on the year's claimable amount including the deductible (a plan: one rate)                                 | to_verify | M3      |
| R-SG-005 | A plan pays as charged within its ward entitlement; above it, only the plan's own pro-ration share is claimable                   | verified  | W       |
| R-SG-006 | A rider pays the deductible and co-insurance, the insured keeps at least 5 %; the cap needs the panel or pre-authorisation        | to_verify | M4, W   |
| R-SG-007 | Nothing is paid above the policy-year limit                                                                                       | to_verify | M1, W   |
| R-SG-010 | Panel unknown: both branches and one question for the desk                                                                        | verified  | M4      |

Rider design by date ([R] SG-RID-01..06): riders sold from 8 Mar 2018 carry at least 5 %
co-payment with a cap of at least $3,000 a year; riders sold from 1 Apr 2026 no longer pay the
MOH minimum deductible and cap the co-payment, excluding the deductible, at $6,000 or more, the cap
applying only to panel or pre-authorised claims. Rider premiums are paid in cash, never from
MediSave (SG-PMIS-02).

## Claim letter (`assessClaim`, Singapore letters)

| Rule        | What it says                                                                                       | Verdict       | Status    | Sources |
| ----------- | -------------------------------------------------------------------------------------------------- | ------------- | --------- | ------- |
| R-SGCLM-001 | Pro-ration applied on a stay within the plan's ward entitlement                                    | challengeable | verified  | W       |
| R-SGCLM-002 | Co-payment above the rider's cap with a panel specialist or pre-authorisation                      | challengeable | to_verify | M4, W   |
| R-SGCLM-003 | A deductible charged twice in a policy year                                                        | challengeable | to_verify | M3, W   |
| R-SGCLM-006 | No clause given: the insurer first, then FIDReC within six months of its final reply (≤ S$150,000) | possibly      | to_verify | M5      |

There is no statutory claim-settlement timeline for health claims in Singapore ([R] §7); GIA's
code (general insurers only) says decide within 7 business days of full information.

## Worked example

`packages/engine/src/examples.ts` holds SX-1; `pnpm --filter @kavach/engine check` runs it.

| Example | Result                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| SX-1    | Ah Kow (68), angioplasty, 3 days, Class B1 plan with a 2022 rider: Class A S$13,986 vs Class B1 S$987 out of pocket; saving S$12,999 |
| SX-2    | The same bill on MediShield Life alone: pro-rated to the B1 factors, most of the bill stays with the family                          |

The sample estimate is `data/samples/sample-general-sg-estimate.png` (fixture
`apps/api/fixtures/estimate-sample-general-sg.json`); the Tan family is `data/personas/tan.json`.
