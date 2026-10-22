/**
 * Worked examples from docs/research/red-team-response.md §3 (HX-1, CX-1), as engine inputs.
 * Reused by the check script, demo seeding and fixtures. All names are fictional samples.
 * Policies mirror pol_parents_migrated and pol_supertopup in data/personas/sharma.json.
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
  insurer: 'Sample Insurer A',
  productName: 'Individual Health (migrated from group)',
  source: 'personal',
  holderMemberId: 'mem_rahul',
  coveredMemberIds: ['mem_suresh', 'mem_kamala'],
  sumInsured: 5_00_000,
  premiumAnnual: 38_500,
  continuousCoverSince: '2022-04-01',
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
  insurer: 'Sample Insurer B',
  productName: 'Super Top-up Floater',
  source: 'personal',
  holderMemberId: 'mem_rahul',
  coveredMemberIds: ['mem_rahul', 'mem_priya', 'mem_anaya', 'mem_suresh', 'mem_kamala'],
  sumInsured: 5_00_000,
  premiumAnnual: 14_200,
  claimsUsedThisYear: 0,
  startDate: '2026-06-15',
  endDate: '2027-06-14',
  terms: { copayPercent: 0, deductible: 5_00_000, proportionateDeduction: false, citations: {} },
};

/** Admission date of the hospital checkpoint in sharma.json. */
export const HX1_AS_OF = '2027-02-08';

export const HX1_CONTEXT: HospitalContext = {
  patient: { age: SURESH.age, memberId: SURESH.memberId },
  policies: [PARENTS_POLICY, SUPER_TOP_UP],
  asOf: HX1_AS_OF,
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
    treatment: 'general',
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
  treatment: 'general',
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
  insurer: 'Sample Insurer A',
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
  letterDate: '2027-02-26',
};

export const CX1_BILL: ClaimBill = {
  total: 2_80_000,
  roomRentPerDay: 5_000,
  billingType: 'differential',
  icuStay: false,
};

// ---------------------------------------------------------------------------------------------
// MX-1: Priya's normal delivery (maternity checkpoint). Modelled on a real Bengaluru maternity
// claim (anonymised: hospital, people and numbers are fictional). The hospital prices by room
// (general ward, twin sharing, non-AC single, AC single); the family took the non-AC room, just
// above the room eligibility, so a small room deduction applied, and then the group policy's
// ₹50,000 maternity cap took the rest. Policy mirrors pol_gmc_startup: like the Acme group cover
// it waives proportionate deduction, so only the room-rent excess itself is cut (R-HL-008), and
// the desk card and the settlement letter split the bill the same way (issue #24).

export const PRIYA = { memberId: 'mem_priya', name: 'Priya', age: 32 };

/** Orbit Labs group health with the maternity benefit (normal ₹50,000, caesarean ₹75,000). */
export const STARTUP_POLICY: Policy = {
  id: 'pol_gmc_startup',
  kind: 'group_health',
  insurer: 'Sample Insurer D',
  productName: 'Orbit Labs Group Health',
  source: 'employer',
  employer: 'Orbit Labs',
  holderMemberId: 'mem_rahul',
  coveredMemberIds: ['mem_rahul', 'mem_priya', 'mem_anaya'],
  sumInsured: 3_00_000,
  claimsUsedThisYear: 0,
  startDate: '2026-12-01',
  endDate: '2027-11-30',
  terms: {
    roomRentLimitPerDay: 2_500,
    copayPercent: 0,
    deductible: 0,
    proportionateDeduction: false,
    maternity: { limitNormal: 50_000, limitCsection: 75_000, newbornDays: 90, waitingMonths: 0 },
    citations: {},
  },
};

/** Admission date of the maternity checkpoint in sharma.json. */
export const MX1_AS_OF = '2027-07-20';

/** The super top-up as renewed on 15 Jun 2027, so it is in force at the delivery. */
export const SUPER_TOP_UP_2027: Policy = {
  ...SUPER_TOP_UP,
  startDate: '2027-06-15',
  endDate: '2028-06-14',
};

export const MX1_CONTEXT: HospitalContext = {
  patient: { age: PRIYA.age, memberId: PRIYA.memberId },
  policies: [STARTUP_POLICY, SUPER_TOP_UP_2027],
  asOf: MX1_AS_OF,
};

/** The four room categories the hospital prices for; the family chose (was quoted) the non-AC single. */
export const MX1_ROOMS = {
  nonac: { id: 'nonac', label: 'Non-AC Single', rentPerDay: 2_750 },
  general: { id: 'general', label: 'General Ward', rentPerDay: 2_000 },
  twin: { id: 'twin', label: 'Twin Sharing', rentPerDay: 2_400 },
  ac: { id: 'ac', label: 'AC Single', rentPerDay: 4_500 },
};

type Four = [general: number, twin: number, nonac: number, ac: number];
const mline = (head: EstimateLine['head'], label: string, amounts: Four): EstimateLine => {
  const [general, twin, nonac, ac] = amounts;
  return {
    head,
    label,
    pricedByRoom: new Set(amounts).size > 1,
    amounts: { general, twin, nonac, ac },
  };
};

/** Lotus Women's Hospital tariff for a normal delivery, 2 days (MX-1), by room category. */
export const MX1_LINES: EstimateLine[] = [
  mline('room', 'Bed charges × 2 days', [4_000, 4_800, 5_500, 9_000]),
  mline('nursing', 'Nursing charges × 2 days', [2_400, 2_800, 3_000, 4_000]),
  mline('ot', 'Labour room charges', [17_000, 18_000, 19_050, 22_000]),
  mline('surgeon', 'Obstetrician professional charges', [26_000, 27_500, 28_750, 32_000]),
  mline('doctor_visits', 'Doctor visits × 2', [2_400, 2_800, 3_000, 4_000]),
  mline('other', 'Paediatrician – newborn check (day 1)', [5_000, 5_000, 5_000, 5_000]),
  mline(
    'diagnostics',
    'Monitoring (NIBP, foetal monitor) & preparation',
    [3_200, 3_200, 3_200, 3_200],
  ),
  mline('pharmacy', 'Pharmacy (drugs)', [6_700, 6_700, 6_700, 6_700]),
  mline('consumables', 'Consumables (IV set, cannula, pads)', [1_150, 1_150, 1_150, 1_150]),
  mline(
    'non_payable',
    'Non-payable items (registration, shoe cover, apron, baby kit bag)',
    [1_900, 1_900, 1_900, 1_900],
  ),
];

export const MX1_ESTIMATE: HospitalEstimate = {
  hospitalName: "Lotus Women's Hospital",
  patientName: PRIYA.name,
  procedure: 'Normal delivery (spontaneous vertex)',
  treatment: 'maternity_normal',
  admissionType: 'planned',
  days: 2,
  billingType: 'differential',
  roomCategories: [MX1_ROOMS.nonac, MX1_ROOMS.general, MX1_ROOMS.twin, MX1_ROOMS.ac],
  lines: MX1_LINES,
  printedTotals: { general: 69_750, twin: 73_850, nonac: 77_250, ac: 88_950 },
  needsConfirmation: false,
  notes: ['SAMPLE estimate for the Kavach demo'],
};

/** MX-1 settlement letter: every deduction is valid; the cap, not the room, cost the family. */
export const MX1_LETTER: SettlementLetter = {
  insurer: 'Sample Insurer D',
  claimNumber: 'SID/CL/2027/0091127',
  policyNumber: 'SID/GMC/ORBIT/2026',
  patientName: PRIYA.name,
  hospitalName: "Lotus Women's Hospital",
  billAmount: 77_250,
  approvedAmount: 50_000,
  deductions: [
    {
      label: 'Non-payable items',
      amount: 1_900,
      reasonGiven: 'Registration, shoe cover, apron and baby kit bag are not payable (List I)',
    },
    {
      label: 'Excess of room rent charges for higher room opted',
      amount: 500,
      reasonGiven: 'Room rent ₹2,750/day against eligibility ₹2,500/day for 2 days',
    },
    {
      label: 'Excess of defined / ailment limit',
      amount: 24_850,
      reasonGiven:
        'Maternity benefit limited to ₹50,000 per normal delivery under the group policy',
    },
  ],
  copayApplied: 0,
  letterDate: '2027-08-12',
  roomCategory: 'Non-AC Single',
  roomRentPerDay: 2_750,
  roomEligibilityPerDay: 2_500,
  icuStay: false,
};

export const MX1_BILL: ClaimBill = {
  total: 77_250,
  roomRentPerDay: 2_750,
  billingType: 'differential',
  icuStay: false,
};

// ---------------------------------------------------------------------------------------------
// SX-1: Singapore. Ah Kow (68), a Class B1 Integrated Shield Plan with a 2022 rider, admitted
// for an angioplasty at a restructured hospital that offers Class A and Class B1. Amounts are
// whole Singapore dollars (SAMPLE; the plan mirrors a mid-market B1 plan, figures rounded).

export const AH_KOW = { memberId: 'mem_ahkow', name: 'Ah Kow', age: 68 };

export const MEDISHIELD_AHKOW: Policy = {
  id: 'pol_mshl_ahkow',
  kind: 'medishield_life',
  insurer: 'CPF Board (MediShield Life)',
  productName: 'MediShield Life',
  source: 'personal',
  holderMemberId: 'mem_ahkow',
  coveredMemberIds: ['mem_ahkow'],
  sumInsured: 200_000,
  claimsUsedThisYear: 0,
  startDate: '2027-01-01',
  endDate: '2027-12-31',
  terms: { copayPercent: 0, deductible: 0, proportionateDeduction: false, citations: {} },
};

export const SHIELD_PLAN_B1: Policy = {
  id: 'pol_ip_ahkow',
  kind: 'integrated_shield',
  insurer: 'Sample Insurer SG',
  productName: 'Sample Shield Plan B1 with rider (SAMPLE)',
  source: 'personal',
  holderMemberId: 'mem_weiming',
  coveredMemberIds: ['mem_ahkow'],
  sumInsured: 500_000,
  claimsUsedThisYear: 0,
  startDate: '2027-05-01',
  endDate: '2028-04-30',
  terms: {
    copayPercent: 0,
    deductible: 0,
    proportionateDeduction: false,
    citations: {},
    sg: {
      wardEntitlement: 'B1',
      prorationByWard: { A: 0.5, private: 0.25 },
      // MOH minimum IP deductibles for a Class B1 plan: the lower of the target class and the ward used.
      deductibleByWard: { C: 1_500, B2: 2_000, B1: 2_500, A: 2_500, private: 2_500 },
      coinsurance: [{ percent: 10 }],
      policyYearLimit: 500_000,
      rider: { copayPercent: 5, annualCap: 3_000, capNeedsPanel: true, coversDeductible: true },
    },
  },
};

export const SX1_CONTEXT: HospitalContext = {
  patient: { age: AH_KOW.age, memberId: AH_KOW.memberId },
  policies: [MEDISHIELD_AHKOW, SHIELD_PLAN_B1],
  asOf: '2027-06-10',
};

export const SX1_ROOMS = {
  a: { id: 'a', label: 'Class A (single)', rentPerDay: 650, wardClass: 'A' as const },
  b1: { id: 'b1', label: 'Class B1 (4-bedded)', rentPerDay: 280, wardClass: 'B1' as const },
};

type Two = [a: number, b1: number];
const sline = (head: EstimateLine['head'], label: string, amounts: Two): EstimateLine => ({
  head,
  label,
  pricedByRoom: amounts[0] !== amounts[1],
  amounts: { a: amounts[0], b1: amounts[1] },
});

/** Sample General Hospital, angioplasty with one stent, 3 days, priced for Class A and Class B1. */
export const SX1_ESTIMATE: HospitalEstimate = {
  hospitalName: 'Sample General Hospital',
  patientName: AH_KOW.name,
  procedure: 'Coronary angioplasty with one drug-eluting stent',
  treatment: 'general',
  admissionType: 'planned',
  days: 3,
  billingType: 'differential',
  roomCategories: [SX1_ROOMS.a, SX1_ROOMS.b1],
  lines: [
    sline('room', 'Ward charges × 3 days', [1_950, 840]),
    sline('doctor_visits', 'Daily attendance fees × 3', [900, 600]),
    sline('surgeon', "Angioplasty: cardiologist's fee", [9_500, 7_000]),
    sline('ot', 'Cardiac catheterisation laboratory', [6_500, 4_800]),
    sline('implant', 'Drug-eluting stent', [4_200, 4_200]),
    sline('pharmacy', 'Medication', [1_100, 1_100]),
    sline('diagnostics', 'Investigations (ECG, echo, bloods)', [1_600, 1_600]),
    sline('consumables', 'Consumables', [900, 900]),
    sline('non_payable', 'Admission fee and television (non-claimable)', [120, 60]),
  ],
  printedTotals: { a: 26_770, b1: 21_100 },
  needsConfirmation: false,
  notes: ['SAMPLE estimate for the Kavach demo (Singapore)'],
};
