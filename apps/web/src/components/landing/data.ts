import { evaluateHospital, examples, RULES } from '@kavach/engine';
import type { RoomOptionResult } from '@kavach/schemas';

export type RuleStatus = 'verified' | 'to_verify';

/** One line of a room option: what the family pays on top of the policies, and the rule behind it. */
export type OptionRow = { key: string; ruleId?: string; amount: number };

export type AdmissionOption = RoomOptionResult & { rows: OptionRow[] };

/** Rule ids in the order the comparison shows them; co-pay last. */
const ROW_RULES = ['R-HL-008', 'R-HL-001', 'R-HL-005'] as const;

function withRows(option: RoomOptionResult): AdmissionOption {
  const rows: OptionRow[] = ROW_RULES.map((ruleId) => ({
    key: ruleId,
    ruleId,
    amount: option.deductions
      .filter((d) => d.ruleId === ruleId)
      .reduce((sum, d) => sum + d.amount, 0),
  }));
  rows.push({ key: 'copay', ruleId: 'R-HL-003', amount: option.copay });
  // Anything else the engine did not pay still shows, so the rows always add up to the total.
  const shown = rows.reduce((sum, r) => sum + r.amount, 0);
  if (shown !== option.outOfPocket) rows.push({ key: 'other', amount: option.outOfPocket - shown });
  return { ...option, rows };
}

const IRDAI_REF = /IRDAI\/[A-Z0-9/]+/;

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
    statuses: Object.fromEntries(
      Object.values(RULES).map((r) => [r.id, r.status as RuleStatus]),
    ) as Record<string, RuleStatus>,
    circularRef: circular?.title.match(IRDAI_REF)?.[0] ?? circular?.title ?? '',
    masterUrl: master?.url,
    rulesCount: Object.keys(RULES).length,
  };
}

export type Admission = ReturnType<typeof admissionData>;

/** CX-1: the settlement letter for the stay in the room within the limit. */
export function claimData() {
  const letter = examples.CX1_LETTER;
  const cut = letter.deductions.find((d) => /proportionate/i.test(d.label))?.amount ?? 0;
  return { bill: letter.billAmount, approved: letter.approvedAmount, cut };
}
