import {
  type Country,
  evaluateHospital,
  evaluateHospitalSg,
  examples,
  MEDISHIELD_LIFE,
  RULES,
} from '@kavach/engine';
import type { RoomOptionResult } from '@kavach/schemas';

export type RuleStatus = 'verified' | 'to_verify';

/** One line of a room option: what the family pays on top of the policies, and the rule behind it. */
export type OptionRow = { key: string; ruleId?: string; amount: number };

export type AdmissionOption = RoomOptionResult & { rows: OptionRow[] };

/** Rule ids in the order the comparison shows them; co-pay last. */
const ROW_RULES = ['R-HL-008', 'R-HL-001', 'R-HL-005'] as const;
/** Singapore: above the plan's ward, non-claimable items, then the rider's co-payment. */
const SG_ROW_RULES = ['R-SG-005', 'R-HL-005', 'R-SG-006'] as const;

/** The rows of one option; India adds the co-pay row (Singapore's co-payment is a deduction). */
function withRows(
  option: RoomOptionResult,
  ruleIds: readonly string[] = ROW_RULES,
  copayRow = true,
): AdmissionOption {
  const rows: OptionRow[] = ruleIds.map((ruleId) => ({
    key: ruleId,
    ruleId,
    amount: option.deductions
      .filter((d) => d.ruleId === ruleId)
      .reduce((sum, d) => sum + d.amount, 0),
  }));
  if (copayRow) rows.push({ key: 'copay', ruleId: 'R-HL-003', amount: option.copay });
  // Anything else the engine did not pay still shows, so the rows always add up to the total.
  const shown = rows.reduce((sum, r) => sum + r.amount, 0);
  if (shown !== option.outOfPocket) rows.push({ key: 'other', amount: option.outOfPocket - shown });
  return { ...option, rows };
}

const IRDAI_REF = /IRDAI\/[A-Z0-9/]+/;

const isSgRule = (id: string) => id.startsWith('R-SG');

/** The written rules behind a market's numbers: India's rules, or Singapore's R-SG rules. */
export function rulesCountFor(market: Country) {
  return Object.keys(RULES).filter((id) => isSgRule(id) === (market === 'SG')).length;
}

const statuses = () =>
  Object.fromEntries(Object.values(RULES).map((r) => [r.id, r.status as RuleStatus])) as Record<
    string,
    RuleStatus
  >;

/**
 * The City Heart Hospital decision (HX-1), run through the engine on every render: no rupee on
 * the landing page's admission section is typed by hand. Pure; safe on the server.
 */
export function admissionData() {
  const estimate = examples.hx1Estimate();
  const ctx = examples.HX1_CONTEXT;
  const evaluation = evaluateHospital(ctx, estimate);
  const { primary, trace } = evaluation;
  const quotedId = estimate.roomCategories[0]!.id;
  const quoted = primary.options.find((o) => o.roomCategoryId === quotedId)!;
  const pick = primary.options.find((o) => o.roomCategoryId === primary.recommendedRoomCategoryId)!;
  const policy = examples.PARENTS_POLICY;
  const limit = policy.terms.roomRentLimitPerDay ?? 0;
  const ratio = trace.find((f) => f.ruleId === 'R-HL-001' && f.inputs.roomCategoryId === quotedId);

  const ratioRule = RULES['R-HL-001']!;
  const circular = ratioRule.sources[0];
  const master = ratioRule.sources[1];

  return {
    hospital: estimate.hospitalName,
    patient: examples.SURESH,
    days: estimate.days,
    sumInsured: policy.sumInsured,
    limit,
    copayPercent: policy.terms.copayPercent,
    copayFromAge: policy.terms.copayFromAge ?? 0,
    policiesForPatient: ctx.policies.length,
    quoted: withRows(quoted),
    pick: withRows(pick),
    saving: primary.saving,
    /** The room-priced charges the proportionate cut applies to in the quoted room. */
    ratioBase: Number(ratio?.inputs.roomPricedHeads ?? 0),
    /** Every rule that ran, in the order it first fired. */
    fired: [...new Set(trace.map((f) => f.ruleId))],
    ratioRule: { id: ratioRule.id, status: ratioRule.status as RuleStatus },
    statuses: statuses(),
    circularRef: circular?.title.match(IRDAI_REF)?.[0] ?? circular?.title ?? '',
    masterUrl: master?.url,
    rulesCount: rulesCountFor('IN'),
  };
}

export type Admission = ReturnType<typeof admissionData>;

/**
 * The Sample General Hospital decision (SX-1, Singapore), run through the Singapore engine on
 * every render: Ah Kow's Shield plan is bought for Class B1 and the hospital offers Class A.
 * Whole Singapore dollars; nothing typed by hand. Pure; safe on the server.
 */
export function admissionDataSg() {
  const estimate = examples.SX1_ESTIMATE;
  const ctx = examples.SX1_CONTEXT;
  const evaluation = evaluateHospitalSg(ctx, estimate);
  const { primary, trace } = evaluation;
  const quotedRoom = estimate.roomCategories[0]!;
  const quoted = primary.options.find((o) => o.roomCategoryId === quotedRoom.id)!;
  const pick = primary.options.find((o) => o.roomCategoryId === primary.recommendedRoomCategoryId)!;
  const plan = examples.SHIELD_PLAN_B1;
  const terms = plan.terms.sg!;
  const quotedWard = quotedRoom.wardClass ?? 'A';
  const pct = (share = 0) => Math.round(share * 100);
  // Who pays what in each ward: the Shield plan and MediShield Life inside it.
  const shares = (o: RoomOptionResult) => ({
    plan: o.policyShares?.find((s) => s.policyId === plan.id)?.pays ?? 0,
    medishield: o.policyShares?.find((s) => s.policyId === examples.MEDISHIELD_AHKOW.id)?.pays ?? 0,
  });
  const firstSource = (id: string) => RULES[id]?.sources[0];

  return {
    hospital: estimate.hospitalName,
    patient: examples.AH_KOW,
    days: estimate.days,
    policiesForPatient: ctx.policies.length,
    planSumInsured: plan.sumInsured,
    ward: terms.wardEntitlement,
    quotedWard,
    /** The share of the bill the plan counts as claimable in the quoted ward. */
    planShare: pct(terms.prorationByWard?.[quotedWard]),
    /** MediShield Life's own national factors for the quoted ward (ward and surgical charges). */
    mshlWardShare: pct(MEDISHIELD_LIFE.prorationByWard?.[quotedWard]),
    mshlSurgicalShare: pct(MEDISHIELD_LIFE.surgicalProrationByWard?.[quotedWard]),
    riderCopay: terms.rider?.copayPercent ?? 0,
    riderCap: terms.rider?.annualCap ?? 0,
    quoted: withRows(quoted, SG_ROW_RULES, false),
    pick: withRows(pick, SG_ROW_RULES, false),
    quotedShares: shares(quoted),
    pickShares: shares(pick),
    /** What the plan does not count as claimable above its ward. */
    aboveWard: quoted.deductions.find((d) => d.ruleId === 'R-SG-005')?.amount ?? 0,
    saving: primary.saving,
    fired: [...new Set(trace.map((f) => f.ruleId))],
    statuses: statuses(),
    prorationSource: firstSource('R-SG-001'),
    riderSource: firstSource('R-SG-006'),
    rulesCount: rulesCountFor('SG'),
  };
}

export type AdmissionSg = ReturnType<typeof admissionDataSg>;

/** What the opening, the boot and the closing need from either market's decision. */
export type LandingCase = {
  hospital: string;
  patient: { name: string; age: number };
  policiesForPatient: number;
  saving: number;
  rulesCount: number;
  quoted: AdmissionOption;
  pick: AdmissionOption;
};

/** CX-1: the settlement letter for the stay in the room within the limit. */
export function claimData() {
  const letter = examples.CX1_LETTER;
  const cut = letter.deductions.find((d) => /proportionate/i.test(d.label))?.amount ?? 0;
  return { bill: letter.billAmount, approved: letter.approvedAmount, cut };
}
