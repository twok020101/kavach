# Kavach rules pack: India (IN)

Human-readable copy of the rules in `packages/engine/src/rules.ts`. The code is the source of truth; keep the two in step.

Policy-specific values (room-rent limit, ICU limit, co-pay, deductible) always come from the policy's own terms, never from this pack.

**Status:** `to_verify` means a human still has to open the primary source and copy the paragraph number. Kavach shows "Check with your insurer" on rules in that state. A person (not an agent) flips a rule to `verified`.

**Sources**

- [S1] IRDAI circular IRDAI/HLT/REG/CIR/151/06/2020 (proportionate deductions), as quoted in insurers' filed wordings
- [S2] IRDAI Master Circular on Health Insurance Business, 29 May 2024
- [W] The policy's own wording

## Hospital desk (`evaluateHospital`)

| Rule     | What it says                                                                                                                                                                                                              | Status    | Sources |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| R-HL-001 | Room rent above the limit at a hospital that bills by room category: only heads the tariff prices by room category are reduced by limit / actual rent. Never pharmacy, consumables, implants, devices, diagnostics or ICU | to_verify | S1, S2  |
| R-HL-002 | ICU charges are never proportionately deducted. ICU rent is still capped at the wording's ICU limit, if any                                                                                                               | to_verify | S1, S2  |
| R-HL-003 | Co-pay applies to the admissible amount after all deductions                                                                                                                                                              | verified  | W       |
| R-HL-005 | Items on the non-payable list are not admissible                                                                                                                                                                          | to_verify | S2, W   |
| R-HL-006 | With several policies the insured chooses which to claim from first; Kavach picks the order with the lowest out-of-pocket (ties: employer cover first, super top-up last)                                                 | to_verify | S2      |
| R-HL-008 | Room rent above the per-day limit is not admissible                                                                                                                                                                       | verified  | W       |
| R-HL-009 | A super top-up pays only above its deductible; amounts paid by other policies count toward it                                                                                                                             | verified  | W       |
| R-HL-010 | Billing type unknown: compute both branches (differential and flat) and ask the desk one question                                                                                                                         | verified  | S1      |
| R-HL-014 | Package rate: no ratio applied by Kavach; ask the desk for the package price in the room within the limit                                                                                                                 | verified  | S1      |

## Claim letter (`assessClaim`)

| Rule      | What it says                                                                          | Verdict                | Status    | Sources |
| --------- | ------------------------------------------------------------------------------------- | ---------------------- | --------- | ------- |
| R-CLM-001 | Proportionate deduction when the room was within the limit                            | challengeable          | to_verify | S1, S2  |
| R-CLM-002 | Proportionate deduction on pharmacy, consumables, implants, devices or diagnostics    | challengeable          | to_verify | S1, S2  |
| R-CLM-004 | Consumables deducted that were part of the procedure                                  | possibly               | to_verify | S2, W   |
| R-CLM-005 | Co-pay must be the policy rate on the bill after deductions                           | challengeable if wrong | verified  | W       |
| R-CLM-006 | Deduction with no clause given                                                        | possibly               | to_verify | S2      |
| R-CLM-008 | Proportionate deduction on ICU charges, or at a hospital without differential billing | challengeable          | to_verify | S1, S2  |

Recoverable amount for a challengeable or possibly deduction = the deduction × (1 − co-pay rate).

## Worked examples

`packages/engine/src/examples.ts` holds the inputs; `pnpm --filter @kavach/engine check` runs them.

| Example           | Result                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| HX-1 differential | Deluxe ₹1,50,800 vs Single Standard ₹60,800; saving ₹90,000; Deluxe deduction ₹80,000 |
| HX-1 flat         | ₹86,800 vs ₹70,800; saving ₹16,000                                                    |
| HX-1 unknown      | both branches above + one question for the desk                                       |
| HX-1 package      | no ratio; asks for the Single Standard package price                                  |
| CX-1              | approved ₹2,04,640; recoverable ₹14,560 (₹7,680 + ₹6,880); expected payout ₹2,19,200  |
