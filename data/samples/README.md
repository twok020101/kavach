# Sample documents

Made-up documents for the Sharma family demo. Every page is marked **"SAMPLE – FOR DEMONSTRATION"** in the footer; the hospital, insurers, employer, people, policy numbers and UINs are all fictional.

Do not edit these files by hand. They are rendered from the HTML templates in `scripts/samples/templates/`; change a template and run:

```bash
pnpm samples
```

Multi-page documents get one PNG per page (`-p1`, `-p2`, …) next to the PDF, so page numbers in citations match.

| File                                          | Kind              | What it shows                                                                                                                                                                                                                                                                                     | Fixture (what the reader extracts)               |
| --------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `city-heart-estimate.pdf` / `.png`            | hospital_estimate | City Heart Hospital, Bengaluru: estimate for Suresh Sharma (62), planned PTCA, 4 days. Room-category tariff table, Deluxe Single ₹9,000/day vs Single Standard ₹5,000/day, totals ₹3,46,000 / ₹2,80,000 (HX-1). Tariff note says nursing, surgeon, cath lab and doctor visits are priced by room. | `apps/api/fixtures/estimate-city-heart.json`     |
| `city-heart-estimate-photo.png`               | hospital_estimate | The same estimate made to look like a phone photo: tilted, warm light, shadow on a desk.                                                                                                                                                                                                          | same                                             |
| `suraksha-settlement-letter.pdf` / `.png`     | claim_letter      | CX-1 settlement letter from Suraksha Health Insurance Ltd (SAMPLE): bill ₹2,80,000; deductions non-payable ₹6,000, proportionate deduction ₹9,600, consumables ₹8,600; co-pay 20% ₹51,160; approved ₹2,04,640.                                                                                    | `apps/api/fixtures/claim-letter-cx1.json`        |
| `acme-benefits-summary.pdf` / `-p1..p3.png`   | benefits_summary  | Acme Software group health: ₹5,00,000 family floater for employee, spouse, children and parents; room rent 1% of SI (₹5,000); no co-pay or proportionate deduction; maternity ₹50,000. Page 3 §9.1: cover ends on the last working day; migration request due 15 days before it.                  | `apps/api/fixtures/doc-benefits-acme.json`       |
| `parents-policy-schedule.pdf` / `-p1..p3.png` | policy_schedule   | Parents' individual floater migrated from the Acme group policy: SI ₹5,00,000, 01-12-2026 to 30-11-2027. Wording extract: §3.1 room rent 1% of SI (₹5,000), §3.2 proportionate deduction, §3.3 no proportionate deduction on ICU, §5.3 20% co-pay for insured aged 61+.                           | `apps/api/fixtures/doc-schedule-parents.json`    |
| `supertopup-schedule.pdf` / `-p1..p2.png`     | policy_schedule   | Nidhi General Insurance Co. Ltd (SAMPLE) super top-up: all five Sharmas, SI ₹5,00,000, aggregate deductible ₹5,00,000 (§2.1), premium ₹14,200, renews 14-06-2027.                                                                                                                                 | `apps/api/fixtures/doc-schedule-supertopup.json` |

The numbers follow `docs/research/red-team-response.md` §3 (rebuilt HX-1 and CX-1), which overrides the plan docs.
