/**
 * Worked examples from docs/research/red-team-response.md §3 (HX-1, CX-1), as engine inputs.
 * Reused by the check script, demo seeding and fixtures. All names are fictional samples.
 */
import type {
  BillingType,
  ClaimBill,
  EstimateLine,
  HospitalEstimate,
  Policy,
  SettlementLetter,
} from '@kavach/schemas';
import type { HospitalContext } from './hospital';

export const SURESH = { memberId: 'mem_suresh', name: 'Suresh', age: 62 };

/** Parents' individual policy, migrated from the employer group cover. */
export const PARENTS_POLICY: Policy = {
  id: 'pol_parents_migrated',
  kind: 'retail_health',
  insurer: 'Sample General Insurance',
  productName: 'Sample Individual Health (migrated from group)',
  source: 'personal',
  holderMemberId: 'mem_rahul',
  coveredMemberIds: ['mem_suresh', 'mem_kamala'],
  sumInsured: 5_00_000,
  claimsUsedThisYear: 0,
  startDate: '2026-12-01',
  endDate: '2027-11-30',
  terms: {
    roomRentLimitPerDay: 5_000,
    copayPercent: 20,
    copayFromAge: 61,
    deductible: 0,
    proportionateDeduction: true,
    citations: {},
  },
};

export const SUPER_TOP_UP: Policy = {
  id: 'pol_supertopup',
  kind: 'super_top_up',
  insurer: 'Sample General Insurance',
  productName: 'Sample Super Top-up',
  source: 'personal',
  holderMemberId: 'mem_rahul',
  coveredMemberIds: ['mem_rahul', 'mem_priya', 'mem_anaya', 'mem_suresh', 'mem_kamala'],
  sumInsured: 5_00_000,
  claimsUsedThisYear: 0,
  startDate: '2026-04-01',
  endDate: '2027-03-31',
  terms: { copayPercent: 0, deductible: 5_00_000, proportionateDeduction: true, citations: {} },
};

export const HX1_CONTEXT: HospitalContext = {
  patient: { age: SURESH.age, memberId: SURESH.memberId },
  policies: [PARENTS_POLICY, SUPER_TOP_UP],
};

const DELUXE = { id: 'deluxe', label: 'Deluxe', rentPerDay: 9_000 };
const STANDARD = { id: 'standard', label: 'Single Standard', rentPerDay: 5_000 };

const line = (
  head: EstimateLine['head'],
  label: string,
  deluxe: number,
  standard: number,
  pricedByRoom = deluxe !== standard,
): EstimateLine => ({ head, label, pricedByRoom, amounts: { deluxe, standard } });

/** City Heart Hospital's room-category tariff for the angioplasty (red-team-response §3). */
const HX1_LINES: EstimateLine[] = [
  line('room', 'Room × 4 days', 36_000, 20_000),
  line('nursing', 'Nursing & RMO × 4', 8_000, 6_000),
  line('surgeon', 'Surgeon / procedure', 1_20_000, 90_000),
  line('ot', 'Cath lab / OT', 40_000, 26_000),
  line('doctor_visits', 'Doctor visits', 12_000, 8_000),
  line('implant', 'Stent (implant)', 45_000, 45_000),
  line('pharmacy', 'Pharmacy & consumables', 55_000, 55_000),
  line('diagnostics', 'Diagnostics', 24_000, 24_000),
  line('non_payable', 'Non-payable items', 6_000, 6_000),
];

/** HX-1 estimate. The quoted room is Deluxe; pass a billing type to try each branch. */
export function hx1Estimate(billingType: BillingType = 'differential'): HospitalEstimate {
  return {
    hospitalName: 'City Heart Hospital',
    patientName: SURESH.name,
    procedure: 'Coronary angioplasty',
    admissionType: 'planned',
    days: 4,
    billingType,
    roomCategories: [DELUXE, STANDARD],
    lines: HX1_LINES,
    needsConfirmation: false,
    notes: ['SAMPLE estimate for the Kavach demo'],
  };
}

/** ICU case: an emergency stay with 2 ICU days at ₹15,000 against an ICU limit of ₹10,000. */
export const ICU_POLICY: Policy = {
  ...PARENTS_POLICY,
  id: 'pol_parents_icu',
  terms: { ...PARENTS_POLICY.terms, icuLimitPerDay: 10_000 },
};

export const ICU_CONTEXT: HospitalContext = {
  patient: { age: SURESH.age, memberId: SURESH.memberId },
  policies: [ICU_POLICY],
};

export const ICU_ESTIMATE: HospitalEstimate = {
  hospitalName: 'City Heart Hospital',
  patientName: SURESH.name,
  procedure: 'Acute MI management',
  admissionType: 'emergency',
  days: 5,
  billingType: 'differential',
  roomCategories: [DELUXE],
  lines: [
    {
      head: 'room',
      label: 'Room × 3 days',
      pricedByRoom: true,
      amounts: { deluxe: 27_000 },
      days: 3,
    },
    // Marked pricedByRoom on purpose: ICU must still never be proportionately deducted.
    {
      head: 'icu',
      label: 'ICU × 2 days',
      pricedByRoom: true,
      amounts: { deluxe: 30_000 },
      days: 2,
    },
    {
      head: 'surgeon',
      label: 'Cardiologist / procedure',
      pricedByRoom: true,
      amounts: { deluxe: 1_00_000 },
    },
    { head: 'pharmacy', label: 'Pharmacy', pricedByRoom: false, amounts: { deluxe: 40_000 } },
  ],
  needsConfirmation: false,
  notes: ['SAMPLE'],
};

/** CX-1: the settlement letter for the Option B stay (bill ₹2,80,000). */
export const CX1_LETTER: SettlementLetter = {
  insurer: 'Sample General Insurance',
  claimNumber: 'CLM-2027-000417',
  policyNumber: 'SAMPLE-PARENTS-001',
  patientName: SURESH.name,
  hospitalName: 'City Heart Hospital',
  billAmount: 2_80_000,
  approvedAmount: 2_04_640,
  deductions: [
    {
      label: 'Non-payable items (registration, toiletries, attendant food)',
      amount: 6_000,
      reasonGiven: 'Non-payable as per IRDAI list',
    },
    {
      label: 'Proportionate deduction',
      amount: 9_600,
      reasonGiven: 'Proportionate deduction as room rent exceeds eligibility',
    },
    { label: 'Consumables (gloves, PPE kit, syringes)', amount: 8_600, reasonGiven: 'Not payable' },
  ],
  copayApplied: 51_160,
  letterDate: '2027-03-12',
};

export const CX1_BILL: ClaimBill = {
  total: 2_80_000,
  roomRentPerDay: 5_000,
  billingType: 'differential',
  icuStay: false,
};
