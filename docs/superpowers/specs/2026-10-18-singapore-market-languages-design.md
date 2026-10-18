# Singapore market and three more languages

**Date:** 18 Oct 2026, after the submission. **Asked by:** Jai, for the Singapore demo if Kavach is
shortlisted (the Google Cloud team is in Singapore). **Branch:** `feat/sg-market-languages`, a PR to
`main` that Kshitij merges; nothing here touches the submitted build.

## What it adds

1. **Three languages end to end: Tamil (`ta`), Mandarin in Simplified characters (`zh`), Malay
   (`ms`).** Screen strings, the engine's spoken lines, the desk cards, the WhatsApp messages, the
   live agent's style notes, fonts and the language switch. Hindi keeps its Latin-script speech;
   the new three speak in their own script, which Gemini's native-audio voices read. All three are
   on Google's Live API language list (`ta`, `zh-Hans`, `ms`).
2. **A second market, Singapore (`country: 'SG'`), beside India.** Money in Singapore dollars,
   a Singapore rules pack with its own ids and sources, Singapore policy kinds, a Singapore demo
   family and hospital scene, and the claim-appeal route for Singapore.

## Singapore rules pack (`data/rules/SG`, `R-SG-*`)

Sources, in the order the engine cites them:

- [M1] MOH, MediShield Life benefits (claim limits for admissions on or after 1 June 2026:
  normal ward $830/day, ICU $5,140/day, an extra $800/day for the first two inpatient days;
  policy-year limit $200,000; no lifetime limit).
- [M2] CPF Board, MediShield Life pro-ration factors for admissions on or after 1 April 2025
  (Singapore Citizens: Class C and B2 100 %, Class B1 34 %, Class A 27 %, private hospital 16 %,
  day surgery private 21 %).
- [M3] MOH / CPF, MediShield Life deductible and co-insurance (deductible per policy year by ward
  class, age 80 and below: Class C $1,500, Class B2 and above $2,000, day surgery $1,500; age 81
  and above: $2,000 / $3,000 / $2,000; co-insurance on the claimable amount: 10 % up to $5,000,
  5 % from $5,000 to $10,000, 3 % above $10,000).
- [M4] MOH, Integrated Shield Plan riders: minimum 5 % co-payment on every rider sold from
  1 April 2018; the co-payment cap applies only when the insurer's conditions are met (panel
  specialist, pre-authorisation): $3,000 a year for riders bought before 1 April 2026, $6,000 for
  riders sold from 1 April 2026, which also no longer cover the deductible.
- [M5] MOH and LIA, claim disputes: appeal to the insurer first (LIA: reply within 14 business
  days); clinical disputes to the Clinical Claims Resolution Process; other disputes to FIDReC
  (free, within six months of the insurer's final reply, awards up to S$150,000).
- [W] The plan's own terms (ward entitlement, the plan's pro-ration for a higher ward class,
  deductible, co-insurance, rider cap and conditions).

Every rule starts `to_verify`, as the India pack did; a person flips it after reading the primary
page. Figures that the pack carries (claim limits, deductibles, co-insurance bands, MediShield
pro-ration) are data in `data/rules/SG/medishield-life.json`, dated, so a reviewer can check them
against the MOH page without reading code.

| Rule      | What it says                                                                                                                                                                 | Sources |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| R-SG-001  | MediShield Life pro-rates the bill by ward class and hospital type before anything else                                                                                      | M2      |
| R-SG-002  | MediShield Life claims are capped per day for the ward and for ICU, with the first-two-days extra                                                                            | M1      |
| R-SG-003  | The deductible per policy year depends on the ward class and the age; it comes off the claimable amount once                                                                 | M3      |
| R-SG-004  | Co-insurance is tiered on the claimable amount after the deductible                                                                                                          | M3      |
| R-SG-005  | An Integrated Shield Plan pays as charged within its ward entitlement; a higher ward class is pro-rated by the plan's own factor                                              | W       |
| R-SG-006  | A rider covers the deductible and co-insurance, but the insured pays at least 5 %; the cap applies only with a panel specialist and pre-authorisation, else there is no cap | M4, W   |
| R-SG-007  | MediShield Life pays nothing above the policy-year limit                                                                                                                     | M1      |
| R-SG-010  | Panel and pre-authorisation unknown: compute both branches and ask the desk one question                                                                                     | M4      |
| R-SGCLM-001 | Pro-ration applied although the ward was within the plan's entitlement is challengeable                                                                                   | W       |
| R-SGCLM-002 | Co-payment above the rider's cap although the specialist was on the panel and pre-authorisation was obtained is challengeable                                             | M4, W   |
| R-SGCLM-003 | A deductible charged twice (MediShield Life and the plan) is challengeable                                                                                                 | W       |
| R-SGCLM-006 | A deduction with no clause given is possibly recoverable; ask the insurer                                                                                                  | M5      |

## The Singapore scene (SX-1)

The Tan family in Singapore: Wei Ming (self, 38), Hui Ling (spouse, 36), Jia En (child, 6),
Tan Ah Kow (father, 68, Singapore Citizen), Lim Siew Hong (mother, 64). Everyone has MediShield
Life. The father has an Integrated Shield Plan for Class B1 wards in public hospitals with a
rider bought in 2022 (5 % co-payment, capped at $3,000 with a panel specialist and
pre-authorisation). He is admitted for an angioplasty and the family is quoted at a private
hospital. The desk shows what the family pays in a private single room, a Class A ward and a
Class B1 ward, which policy to show first, and the one question to ask: is the cardiologist on
the insurer's panel, and has pre-authorisation been obtained. The hero figure is the difference
between the private room and the Class B1 ward, from the engine.

All names, the hospital and the insurer are fictional and marked SAMPLE. The plan's terms mirror
a mid-market B1 plan as published in MOH's IP comparison, with the figures rounded.

## Not in this change

- Tamil, Mandarin and Malay speech recognition have been tried only with typed text; a phone
  test in each language is still to do.
- MediSave (the savings account that pays the deductible and co-insurance) is named in the copy
  but not modelled: the family's out-of-pocket is what MediShield Life and the plan do not pay.
- Permanent Resident and foreigner pro-ration factors, outpatient and day-surgery claims, and
  cancer drug limits are outside the hospital scene.
- Pre-April-2021 riders that covered the full bill are treated as the 5 % kind.
