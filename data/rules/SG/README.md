# Kavach rules pack: Singapore (SG)

Human-readable copy of the Singapore rules in `packages/engine/src/rules.ts` and the figures in
`packages/engine/src/hospital-sg.ts` (`MEDISHIELD_LIFE`). The code is the source of truth; keep
the two in step. Plan-specific values (ward entitlement, the plan's pro-ration, deductible,
co-insurance, rider cap and conditions) always come from the plan's own terms, never from this pack.

**Status:** `to_verify` means a human still has to open the primary page and confirm the figure
and its effective date. Kavach shows "Check with your insurer" on rules in that state. A person
(not an agent) flips a rule to `verified`.

**Sources**

- [M1] MOH, MediShield Life benefits: claim limits for admissions on or after 1 June 2026
- [M2] CPF Board, MediShield Life pro-ration factors for admissions on or after 1 April 2025
- [M3] MOH / CPF, MediShield Life deductible and co-insurance (2025 schedule)
- [M4] MOH, Integrated Shield Plan riders (2018 minimum 5 % co-payment; changes from 1 April 2026)
- [M5] MOH and LIA, claim disputes (insurer, Clinical Claims Resolution Process, FIDReC)
- [W] The plan's own terms

## MediShield Life figures carried by the engine (dated 18 Oct 2026)

| Figure                                   | Value                                                               | Source |
| ---------------------------------------- | ------------------------------------------------------------------- | ------ |
| Daily ward charges                       | $830 a day, plus $800 a day for the first two inpatient days        | M1     |
| ICU                                      | $5,140 a day                                                        | M1     |
| Policy-year limit                        | $200,000; no lifetime limit                                         | M1     |
| Pro-ration, Singapore Citizens           | Class C and B2 100 %, Class B1 34 %, Class A 27 %, private 16 %     | M2     |
| Deductible, age 80 and below             | Class C $1,500; Class B2 and above $2,000                            | M3     |
| Deductible, age 81 and above             | Class C $2,000; Class B2 and above $3,000                            | M3     |
| Co-insurance (inpatient)                 | 10 % up to $5,000, 5 % from $5,000 to $10,000, 3 % above $10,000    | M3     |

Not modelled: Permanent Resident and foreigner factors, day surgery, outpatient, surgical-table
limits, cancer drug limits, MediSave (which pays the family's share, it does not reduce it).

## Hospital desk (`evaluateHospitalSg`)

| Rule     | What it says                                                                                                           | Status    | Sources |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| R-SG-001 | MediShield Life pro-rates the bill by ward class and hospital type before the claim limits                            | to_verify | M2, M1  |
| R-SG-002 | Daily ward and ICU charges are capped, with the first-two-days extra                                                   | to_verify | M1      |
| R-SG-003 | The deductible per policy year depends on the ward class and the age, and comes off once                              | to_verify | M1      |
| R-SG-004 | Co-insurance is tiered on the claimable amount after the deductible (a plan: one rate)                                | to_verify | M1      |
| R-SG-005 | A plan pays as charged within its ward entitlement; above it, only the plan's own pro-ration share is claimable        | verified  | W       |
| R-SG-006 | A rider pays the deductible and co-insurance, the insured keeps at least 5 %; the cap needs the panel and pre-authorisation | to_verify | M4, W |
| R-SG-007 | Nothing is paid above the policy-year limit                                                                            | to_verify | M1, W   |
| R-SG-010 | Panel unknown: both branches and one question for the desk                                                             | verified  | M4      |

## Claim letter (`assessClaim`, Singapore letters)

| Rule        | What it says                                                                          | Verdict       | Status    | Sources |
| ----------- | ------------------------------------------------------------------------------------- | ------------- | --------- | ------- |
| R-SGCLM-001 | Pro-ration applied on a stay within the plan's ward entitlement                       | challengeable | verified  | W       |
| R-SGCLM-002 | Co-payment above the rider's cap with a panel specialist and pre-authorisation        | challengeable | to_verify | M4, W   |
| R-SGCLM-003 | A deductible charged twice in a policy year                                           | challengeable | to_verify | M1, W   |
| R-SGCLM-006 | No clause given: appeal to the insurer, then CCRP (clinical) or FIDReC (other)        | possibly      | to_verify | M5      |

## Worked example

`packages/engine/src/examples.ts` holds SX-1; `pnpm --filter @kavach/engine check` runs it.

| Example | Result                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| SX-1    | Ah Kow, angioplasty, 3 days, Class B1 plan with rider: Class A S$13,986 vs Class B1 S$1,012 out of pocket; saving S$12,974 |
