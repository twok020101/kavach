import type {
  DeskEvaluation,
  HospitalEstimate,
  Policy,
  RoomCategory,
  RoomOptionResult,
  RuleFiring,
  SgTerms,
  WardClass,
} from '@kavach/schemas';
import type { HospitalContext } from './hospital';
import { roundRupees } from './money';
import { fire } from './rules';

/**
 * Singapore hospital desk (rules R-SG-*): MediShield Life and an Integrated Shield Plan (IP)
 * with or without a rider. Amounts are whole Singapore dollars in the same `Rupees` integer
 * fields the Indian engine uses; the market decides how they are printed.
 *
 * Model, per ward class on the estimate:
 *  1. The share of the bill that counts as claimable: everything within the plan's ward
 *     entitlement, the plan's pro-ration factor above it (R-SG-005); MediShield Life pro-rates by
 *     the national table (R-SG-001) and caps the daily ward and ICU charges (R-SG-002).
 *  2. The deductible for the ward class and the patient's age comes off once (R-SG-003).
 *  3. Co-insurance on the rest, tiered for MediShield Life, one rate for a plan (R-SG-004).
 *  4. A rider pays the deductible and the co-insurance above its own share, capped only when
 *     the specialist is on the panel with pre-authorisation (R-SG-006); unknown: both branches
 *     and one question for the desk (R-SG-010).
 * The family pays what is not claimable, the deductible unless a rider covers it, and its share
 * of the co-insurance. MediSave is not modelled: it can pay that share, it does not reduce it.
 */

/**
 * MediShield Life figures, from MOH and CPF pages, dated. `data/rules/SG/README.md` mirrors them.
 * Claim limits: admissions on or after 1 June 2026 (MOH). Pro-ration: admissions on or after
 * 1 April 2025, Singapore Citizens (CPF Table G). Deductible and co-insurance: MOH, 2025.
 */
export const MEDISHIELD_LIFE: SgTerms = {
  wardEntitlement: 'B2',
  prorationByWard: { C: 1, B2: 1, B1: 0.34, A: 0.27, private: 0.16 },
  dailyWardLimit: 830,
  icuDailyLimit: 5_140,
  firstDaysExtra: { days: 2, perDay: 800 },
  deductibleByWard: { C: 1_500, B2: 2_000, B1: 2_000, A: 2_000, private: 2_000 },
  deductibleByWardFrom81: { C: 2_000, B2: 3_000, B1: 3_000, A: 3_000, private: 3_000 },
  coinsurance: [
    { upTo: 5_000, percent: 10 },
    { upTo: 10_000, percent: 5 },
    { percent: 3 },
  ],
  policyYearLimit: 200_000,
};

const SG_KINDS: readonly Policy['kind'][] = ['medishield_life', 'integrated_shield'];
const WARD_ORDER: WardClass[] = ['C', 'B2', 'B1', 'A', 'private'];

/** True when the patient's cover is Singapore cover (the household is in the SG market). */
export function isSgPolicy(policy: Policy): boolean {
  return SG_KINDS.includes(policy.kind);
}

/** The Singapore terms of a policy; MediShield Life without its own block takes the national figures. */
export function sgTerms(policy: Policy): SgTerms | undefined {
  if (policy.terms.sg) return policy.terms.sg;
  if (policy.kind === 'medishield_life') return MEDISHIELD_LIFE;
  return undefined;
}

export type SgContext = HospitalContext & {
  /** Panel specialist with pre-authorisation: true, false, or unknown (both branches). */
  panel?: boolean;
};

export function evaluateHospitalSg(
  ctx: SgContext,
  estimate: HospitalEstimate,
  roomOptions: RoomCategory[] = [],
): DeskEvaluation {
  const policies = ctx.policies.filter(
    (p) =>
      isSgPolicy(p) &&
      (ctx.patient.memberId === undefined || p.coveredMemberIds.includes(ctx.patient.memberId)) &&
      (!ctx.asOf || (p.startDate <= ctx.asOf && p.endDate >= ctx.asOf)),
  );
  if (policies.length === 0) throw new Error('No Singapore cover for this patient');
  const plan = policies.find((p) => p.kind === 'integrated_shield');
  const medishield = policies.find((p) => p.kind === 'medishield_life');

  const rooms = [...estimate.roomCategories];
  for (const extra of roomOptions) if (!rooms.some((r) => r.id === extra.id)) rooms.push(extra);

  const run = (panel: boolean) => branch(ctx, estimate, rooms, plan, medishield, panel);
  const trace: RuleFiring[] = [];
  let primary: Run;
  let alternate: Run | undefined;
  let questionForDesk: string | undefined;

  const rider = plan && sgTerms(plan)?.rider;
  const capMatters =
    !!rider?.annualCap && rider.capNeedsPanel && ctx.panel === undefined && run(false).capBinds;
  if (capMatters) {
    primary = run(true);
    alternate = run(false);
    questionForDesk =
      "Is the treating specialist on your insurer's panel, and has pre-authorisation been obtained?";
    trace.push(
      fire(
        'R-SG-010',
        { panel: 'unknown', cap: rider!.annualCap },
        {
          panelOutOfPocket: primary.branch.options.map((o) => o.outOfPocket),
          nonPanelOutOfPocket: alternate.branch.options.map((o) => o.outOfPocket),
          questionForDesk,
        },
      ),
    );
  } else {
    primary = run(ctx.panel ?? true);
  }

  trace.push(...primary.trace, ...(alternate?.trace ?? []));
  return {
    policyOrder: [plan?.id, medishield?.id].filter((id): id is string => !!id),
    primary: primary.branch,
    alternate: alternate?.branch,
    questionForDesk,
    trace,
  };
}

type Run = { branch: DeskEvaluation['primary']; trace: RuleFiring[]; capBinds: boolean };

function branch(
  ctx: SgContext,
  estimate: HospitalEstimate,
  rooms: RoomCategory[],
  plan: Policy | undefined,
  medishield: Policy | undefined,
  panel: boolean,
): Run {
  const trace: RuleFiring[] = [];
  let capBinds = false;
  const options = rooms.map((room) => {
    const o = settle(ctx, estimate, room, plan, medishield, panel, trace);
    if (o.capBound) capBinds = true;
    return o.result;
  });
  const recommended = options.reduce((a, b) =>
    b.outOfPocket < a.outOfPocket ||
    (b.outOfPocket === a.outOfPocket && b.rentPerDay < a.rentPerDay)
      ? b
      : a,
  );
  const worst = Math.max(...options.map((o) => o.outOfPocket));
  return {
    trace,
    capBinds,
    branch: {
      billingType: 'differential',
      options,
      recommendedRoomCategoryId: recommended.roomCategoryId,
      saving: worst - recommended.outOfPocket,
    },
  };
}

type Deduction = RoomOptionResult['deductions'][number];

/** The ward class of a room: as marked, else read from the label, else private. */
export function wardOf(room: RoomCategory): WardClass {
  if (room.wardClass) return room.wardClass;
  const label = room.label.toLowerCase();
  if (/\bb2\b|\bclass b2|subsidi/.test(label)) return 'B2';
  if (/\bb1\b|\bclass b1/.test(label)) return 'B1';
  if (/\bclass c\b|\bward c\b/.test(label)) return 'C';
  if (/\bclass a\b|\bward a\b|\ba1\b/.test(label)) return 'A';
  return 'private';
}

const higher = (a: WardClass, b: WardClass) => WARD_ORDER.indexOf(a) > WARD_ORDER.indexOf(b);

/** The lines of the estimate priced for one room, split into claimable heads and non-payables. */
function priced(estimate: HospitalEstimate, room: RoomCategory) {
  const quoted = estimate.roomCategories[0]!;
  const lines = estimate.lines.map((line) => {
    const days = line.days ?? estimate.days;
    const amount =
      line.head === 'room'
        ? (line.amounts[room.id] ?? room.rentPerDay * days)
        : (line.amounts[room.id] ?? line.amounts[quoted.id] ?? 0);
    return { head: line.head, amount, days };
  });
  const bill = lines.reduce((s, l) => s + l.amount, 0);
  const nonPayable = lines.filter((l) => l.head === 'non_payable').reduce((s, l) => s + l.amount, 0);
  return { lines, bill, nonPayable };
}

/** Tiered co-insurance on an amount: 10% of the first $5,000, 5% of the next $5,000, 3% beyond. */
function coinsurance(amount: number, tiers: SgTerms['coinsurance']): number {
  let total = 0;
  let from = 0;
  for (const tier of tiers) {
    const to = tier.upTo ?? Infinity;
    const slice = Math.max(0, Math.min(amount, to) - from);
    total += (slice * tier.percent) / 100;
    from = to;
    if (amount <= to) break;
  }
  return roundRupees(total);
}

function deductibleFor(terms: SgTerms, ward: WardClass, age: number): number {
  const table = age >= 81 && terms.deductibleByWardFrom81 ? terms.deductibleByWardFrom81 : terms.deductibleByWard;
  return table[ward] ?? 0;
}

/**
 * What MediShield Life alone would pay for this room: pro-rated by ward class, capped per day,
 * less the deductible and tiered co-insurance, within the policy-year limit.
 */
function medishieldPays(
  ctx: SgContext,
  policy: Policy,
  room: RoomCategory,
  ward: WardClass,
  p: ReturnType<typeof priced>,
  trace: RuleFiring[],
): number {
  const terms = sgTerms(policy)!;
  const factor = terms.prorationByWard[ward] ?? 1;
  let claimable = 0;
  for (const line of p.lines) {
    if (line.head === 'non_payable') continue;
    const prorated = line.amount * factor;
    if (line.head === 'room' && terms.dailyWardLimit !== undefined) {
      const extra = terms.firstDaysExtra
        ? Math.min(line.days, terms.firstDaysExtra.days) * terms.firstDaysExtra.perDay
        : 0;
      claimable += Math.min(prorated, terms.dailyWardLimit * line.days + extra);
    } else if (line.head === 'icu' && terms.icuDailyLimit !== undefined) {
      claimable += Math.min(prorated, terms.icuDailyLimit * line.days);
    } else {
      claimable += prorated;
    }
  }
  claimable = roundRupees(claimable);
  const deductible = deductibleFor(terms, ward, ctx.patient.age);
  const afterDeductible = Math.max(0, claimable - deductible);
  const coins = coinsurance(afterDeductible, terms.coinsurance);
  const yearLeft = Math.max(0, (terms.policyYearLimit ?? Infinity) - policy.claimsUsedThisYear);
  const pays = Math.min(afterDeductible - coins, yearLeft);
  const ctxIds = { roomCategoryId: room.id, policyId: policy.id, ward };
  trace.push(
    fire('R-SG-001', { ...ctxIds, factor, bill: p.bill }, { claimable }),
    fire(
      'R-SG-002',
      { ...ctxIds, dailyWardLimit: terms.dailyWardLimit, icuDailyLimit: terms.icuDailyLimit },
      { claimable },
    ),
    fire('R-SG-003', { ...ctxIds, age: ctx.patient.age, deductible }, { afterDeductible }),
    fire('R-SG-004', { ...ctxIds, tiers: terms.coinsurance }, { coinsurance: coins }),
  );
  if (afterDeductible - coins > yearLeft) {
    trace.push(fire('R-SG-007', { ...ctxIds, yearLeft }, { pays }));
  }
  return pays;
}

function settle(
  ctx: SgContext,
  estimate: HospitalEstimate,
  room: RoomCategory,
  plan: Policy | undefined,
  medishield: Policy | undefined,
  panel: boolean,
  trace: RuleFiring[],
): { result: RoomOptionResult; capBound: boolean } {
  const ward = wardOf(room);
  const p = priced(estimate, room);
  const deductions: Deduction[] = [];
  const policyShares: RoomOptionResult['policyShares'] = [];
  let capBound = false;

  if (p.nonPayable > 0) {
    deductions.push({ ruleId: 'R-HL-005', label: 'Non-payable items', amount: p.nonPayable });
  }

  const mshl = medishield ? medishieldPays(ctx, medishield, room, ward, p, trace) : 0;

  if (!plan) {
    // MediShield Life alone: the family pays everything it does not.
    const paid = Math.max(0, mshl);
    const terms = sgTerms(medishield!)!;
    const deductible = deductibleFor(terms, ward, ctx.patient.age);
    deductions.push({
      ruleId: 'R-SG-001',
      label: `Not claimable in a ${ward} ward (pro-ration)`,
      amount: Math.max(0, p.bill - p.nonPayable - paid - deductible),
    });
    deductions.push({ ruleId: 'R-SG-003', label: 'Deductible', amount: deductible });
    policyShares.push({ policyId: medishield!.id, pays: paid });
    return {
      capBound,
      result: {
        roomCategoryId: room.id,
        label: room.label,
        rentPerDay: room.rentPerDay,
        bill: p.bill,
        admissible: paid + deductible,
        deductions,
        copay: 0,
        policyPays: paid,
        outOfPocket: p.bill - paid,
        policyShares,
      },
    };
  }

  // An Integrated Shield Plan: as charged within the entitlement, pro-rated above it (R-SG-005).
  const terms = sgTerms(plan)!;
  const above = higher(ward, terms.wardEntitlement);
  const factor = above ? (terms.prorationByWard[ward] ?? 1) : 1;
  const claimable = roundRupees((p.bill - p.nonPayable) * factor);
  const notClaimable = p.bill - p.nonPayable - claimable;
  const ids = { roomCategoryId: room.id, policyId: plan.id, ward };
  trace.push(
    fire(
      'R-SG-005',
      { ...ids, entitlement: terms.wardEntitlement, factor },
      { claimable, notClaimable },
    ),
  );
  if (notClaimable > 0) {
    deductions.push({
      ruleId: 'R-SG-005',
      label: `Above the plan's ${terms.wardEntitlement} entitlement (pro-rated)`,
      amount: notClaimable,
    });
  }

  const deductible = Math.min(claimable, deductibleFor(terms, ward, ctx.patient.age));
  const afterDeductible = claimable - deductible;
  const coins = coinsurance(afterDeductible, terms.coinsurance);
  trace.push(
    fire('R-SG-003', { ...ids, age: ctx.patient.age, deductible }, { afterDeductible }),
    fire('R-SG-004', { ...ids, tiers: terms.coinsurance }, { coinsurance: coins }),
  );
  const yearLeft = Math.max(0, (terms.policyYearLimit ?? Infinity) - plan.claimsUsedThisYear);
  let planPays = Math.min(afterDeductible - coins, yearLeft);
  if (afterDeductible - coins > yearLeft) trace.push(fire('R-SG-007', { ...ids, yearLeft }, { planPays }));

  // The rider (R-SG-006): pays the deductible and the co-insurance above the insured's share.
  let familyDeductible = deductible;
  let familyCoins = coins;
  if (terms.rider) {
    const share = roundRupees((afterDeductible * terms.rider.copayPercent) / 100);
    const capApplies = terms.rider.annualCap !== undefined && (panel || !terms.rider.capNeedsPanel);
    const capped = capApplies ? Math.min(share, terms.rider.annualCap!) : share;
    capBound = terms.rider.annualCap !== undefined && share > terms.rider.annualCap;
    familyCoins = Math.min(coins, capped);
    if (terms.rider.coversDeductible) familyDeductible = 0;
    planPays += deductible - familyDeductible + (coins - familyCoins);
    trace.push(
      fire(
        'R-SG-006',
        {
          ...ids,
          copayPercent: terms.rider.copayPercent,
          annualCap: terms.rider.annualCap,
          panel,
          coversDeductible: terms.rider.coversDeductible,
        },
        { familyCoPayment: familyCoins, familyDeductible, riderPays: planPays },
      ),
    );
  }
  if (familyDeductible > 0) {
    deductions.push({ ruleId: 'R-SG-003', label: 'Deductible', amount: familyDeductible });
  }
  deductions.push({
    ruleId: terms.rider ? 'R-SG-006' : 'R-SG-004',
    label: terms.rider ? 'Co-payment (your share with the rider)' : 'Co-insurance',
    amount: familyCoins,
  });

  const paid = Math.max(0, Math.min(p.bill, planPays));
  const mshlShare = Math.min(mshl, paid);
  if (medishield) policyShares.push({ policyId: medishield.id, pays: mshlShare });
  policyShares.unshift({ policyId: plan.id, pays: paid - mshlShare });

  return {
    capBound,
    result: {
      roomCategoryId: room.id,
      label: room.label,
      rentPerDay: room.rentPerDay,
      bill: p.bill,
      admissible: claimable,
      deductions,
      copay: familyCoins,
      policyPays: paid,
      outOfPocket: p.bill - paid,
      policyShares,
    },
  };
}
