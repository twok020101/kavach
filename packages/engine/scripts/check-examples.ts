/**
 * Runs the worked examples (HX-1 in every billing branch, an ICU case, CX-1) through the engine,
 * prints the results and exits non-zero if any number differs from the plan.
 * Run: pnpm --filter @kavach/engine check
 */
import {
  Household,
  type BranchResult,
  type ChangeSet,
  type DeskEvaluation,
  type Plan,
} from '@kavach/schemas';
import persona from '../../../data/personas/sharma.json' with { type: 'json' };
import {
  applyChangeSet,
  assessClaim,
  buildDeskSay,
  diff as planDiff,
  evaluateHospital,
  formatInr,
  hindiWords,
  plan,
} from '../src/index';
import {
  CX1_BILL,
  CX1_LETTER,
  HX1_CONTEXT,
  ICU_CONTEXT,
  ICU_ESTIMATE,
  MX1_BILL,
  MX1_CONTEXT,
  MX1_ESTIMATE,
  MX1_LETTER,
  MEDISHIELD_AHKOW,
  PARENTS_POLICY,
  SX1_CONTEXT,
  SX1_ESTIMATE,
  STARTUP_POLICY,
  SUPER_TOP_UP,
  hx1Estimate,
} from '../src/examples';

let failures = 0;

function expect(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  const show = (v: unknown) => (typeof v === 'number' ? formatInr(v) : JSON.stringify(v));
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${show(actual)}${ok ? '' : `  (expected ${show(expected)})`}`,
  );
}

function heading(title: string) {
  console.log(`\n== ${title}`);
}

function printBranch(name: string, branch: BranchResult) {
  console.log(
    `  [${name}: ${branch.billingType}] recommended ${branch.recommendedRoomCategoryId}, saving ${formatInr(branch.saving)}`,
  );
  for (const o of branch.options) {
    const cuts = o.deductions.map((d) => `${d.ruleId} ${formatInr(d.amount)}`).join(', ') || 'none';
    console.log(
      `    ${o.label.padEnd(16)} bill ${formatInr(o.bill).padStart(10)}  admissible ${formatInr(o.admissible).padStart(10)}  co-pay ${formatInr(o.copay).padStart(8)}  insurer ${formatInr(o.policyPays).padStart(10)}  you pay ${formatInr(o.outOfPocket).padStart(10)}  deductions: ${cuts}`,
    );
  }
}

const option = (branch: BranchResult, id: string) =>
  branch.options.find((o) => o.roomCategoryId === id)!;
const deduction = (branch: BranchResult, id: string, ruleId: string) =>
  option(branch, id).deductions.find((d) => d.ruleId === ruleId)?.amount ?? 0;
const fired = (e: DeskEvaluation, ruleId: string) => e.trace.some((f) => f.ruleId === ruleId);

// ---------------------------------------------------------------- say.ts
heading('Amounts for speech');
expect('formatInr(150800)', formatInr(150800), '₹1,50,800');
expect('hindiWords(150800)', hindiWords(150800), 'ek lakh pachaas hazaar aath sau');
expect('hindiWords(60800)', hindiWords(60800), 'saath hazaar aath sau');
expect('hindiWords(90000)', hindiWords(90000), 'nabbe hazaar');
expect('hindiWords(204640)', hindiWords(204640), 'do lakh chaar hazaar chhah sau chaalees');
expect(
  'hindiWords(12345678)',
  hindiWords(12345678),
  'ek crore teyees lakh paintaalees hazaar chhah sau athhattar',
);

// ---------------------------------------------------------------- HX-1 differential
heading('HX-1 differential billing (hospital prices treatment by room)');
const diff = evaluateHospital(HX1_CONTEXT, hx1Estimate('differential'));
printBranch('primary', diff.primary);
expect('policy order', diff.policyOrder.join(' > '), 'pol_parents_migrated > pol_supertopup');
expect('A (Deluxe) out of pocket', option(diff.primary, 'deluxe').outOfPocket, 150_800);
expect('B (Standard) out of pocket', option(diff.primary, 'standard').outOfPocket, 60_800);
expect('saving', diff.primary.saving, 90_000);
expect(
  'A proportionate deduction (R-HL-001)',
  deduction(diff.primary, 'deluxe', 'R-HL-001'),
  80_000,
);
expect('A room above limit (R-HL-008)', deduction(diff.primary, 'deluxe', 'R-HL-008'), 16_000);
expect('B insurer pays', option(diff.primary, 'standard').policyPays, 2_19_200);
expect('super top-up pays nothing in A', option(diff.primary, 'deluxe').policyShares[1]?.pays, 0);
expect('recommended', diff.primary.recommendedRoomCategoryId, 'standard');
expect('no question for desk', diff.questionForDesk, undefined);

const names = { pol_parents_migrated: 'parents wali policy' };
const sayHi = buildDeskSay(diff, 'hi', { policyNames: names });
const sayEn = buildDeskSay(diff, 'en', {
  policyNames: { pol_parents_migrated: "parents' policy" },
});
console.log(`  say (hi): ${sayHi}`);
console.log(`  say (en): ${sayEn}`);
expect('hi says A in words', sayHi.includes('ek lakh pachaas hazaar aath sau rupaye'), true);
expect('hi says B in words', sayHi.includes('saath hazaar aath sau rupaye'), true);
expect('hi ends with TPA confirm', sayHi.endsWith('TPA desk se confirm kar lijiye.'), true);
expect('en ends with TPA confirm', sayEn.endsWith('confirm with the TPA desk.'), true);

// ---------------------------------------------------------------- context handling
heading('Context: co-pay age and policies in force');
const young = evaluateHospital(
  { ...HX1_CONTEXT, patient: { ...HX1_CONTEXT.patient, age: 58 } },
  hx1Estimate(),
);
expect(
  'no co-pay under copayFromAge (61) for a 58-year-old',
  option(young.primary, 'standard').copay,
  0,
);
const expiredTopUp = { ...SUPER_TOP_UP, id: 'pol_old_topup', endDate: '2027-01-31' };
const motor = { ...SUPER_TOP_UP, id: 'pol_motor', kind: 'motor' as const };
const filtered = evaluateHospital(
  { ...HX1_CONTEXT, policies: [...HX1_CONTEXT.policies, expiredTopUp, motor] },
  hx1Estimate(),
);
expect(
  'expired and non-health policies ignored',
  filtered.policyOrder.join(' > '),
  'pol_parents_migrated > pol_supertopup',
);

// ---------------------------------------------------------------- HX-1 flat
heading('HX-1 flat billing (same charges in every room)');
const flat = evaluateHospital(HX1_CONTEXT, hx1Estimate('flat'));
printBranch('primary', flat.primary);
expect('A out of pocket', option(flat.primary, 'deluxe').outOfPocket, 86_800);
expect('B out of pocket', option(flat.primary, 'standard').outOfPocket, 70_800);
expect('saving', flat.primary.saving, 16_000);
expect('no proportionate deduction', fired(flat, 'R-HL-001'), false);
console.log(`  say (en): ${buildDeskSay(flat, 'en')}`);

// ---------------------------------------------------------------- HX-1 unknown
heading('HX-1 billing type unknown (R-HL-010)');
const unknown = evaluateHospital(HX1_CONTEXT, hx1Estimate('unknown'));
printBranch('primary', unknown.primary);
printBranch('alternate', unknown.alternate!);
console.log(`  question: ${unknown.questionForDesk}`);
expect('primary is differential', unknown.primary.billingType, 'differential');
expect('primary saving', unknown.primary.saving, 90_000);
expect('alternate is flat', unknown.alternate?.billingType, 'flat');
expect('alternate saving', unknown.alternate?.saving, 16_000);
expect('asks the desk', Boolean(unknown.questionForDesk), true);
expect('R-HL-010 fired', fired(unknown, 'R-HL-010'), true);
console.log(`  say (hi): ${buildDeskSay(unknown, 'hi', { policyNames: names })}`);

// ---------------------------------------------------------------- HX-1 package
heading('HX-1 package rate (no ratio; ask for the lower-category package price)');
const pkg = evaluateHospital(HX1_CONTEXT, hx1Estimate('package'));
printBranch('primary', pkg.primary);
console.log(`  question: ${pkg.questionForDesk}`);
expect('no proportionate deduction', fired(pkg, 'R-HL-001'), false);
expect(
  'only the quoted room can be priced',
  pkg.primary.options.map((o) => o.roomCategoryId).join(),
  'deluxe',
);
expect('Deluxe package out of pocket', option(pkg.primary, 'deluxe').outOfPocket, 74_000);
expect(
  'asks for the Standard package price',
  pkg.questionForDesk?.includes('package price') && pkg.questionForDesk.includes('Single Standard'),
  true,
);
console.log(`  say (en): ${buildDeskSay(pkg, 'en')}`);

// ---------------------------------------------------------------- ICU
heading('ICU is never proportionately deducted (R-HL-002)');
const icu = evaluateHospital(ICU_CONTEXT, ICU_ESTIMATE);
printBranch('primary', icu.primary);
const icuFiring = icu.trace.find((f) => f.ruleId === 'R-HL-002');
const ratioFiring = icu.trace.find((f) => f.ruleId === 'R-HL-001');
expect('ICU payable (capped at ₹10,000 × 2 days)', icuFiring?.output.payable, 20_000);
expect('ICU above ICU limit', deduction(icu.primary, 'deluxe', 'R-HL-002'), 10_000);
expect('ratio base excludes ICU (surgeon only)', ratioFiring?.inputs.roomPricedHeads, 1_00_000);
expect('proportionate deduction on surgeon', deduction(icu.primary, 'deluxe', 'R-HL-001'), 44_444);
expect('admissible', option(icu.primary, 'deluxe').admissible, 1_30_556);
expect('out of pocket', option(icu.primary, 'deluxe').outOfPocket, 92_555);

// ---------------------------------------------------------------- CX-1
heading('CX-1 claim appeal');
const cx1 = assessClaim(CX1_LETTER, CX1_BILL, PARENTS_POLICY);
for (const d of cx1.deductions) {
  console.log(
    `  ${d.verdict.padEnd(13)} ${formatInr(d.amount).padStart(8)} -> recoverable ${formatInr(d.recoverable).padStart(7)}  ${d.ruleId}  ${d.label}: ${d.reason}`,
  );
}
expect('non-payable is valid', cx1.deductions[0]?.verdict, 'valid');
expect(
  'proportionate is challengeable (R-CLM-001)',
  `${cx1.deductions[1]?.verdict} ${cx1.deductions[1]?.ruleId}`,
  'challengeable R-CLM-001',
);
expect('consumables is possibly', cx1.deductions[2]?.verdict, 'possibly');
expect('approved', cx1.approved, 2_04_640);
expect('recoverable', cx1.recoverable, 14_560);
expect('expected payout', cx1.expectedPayout, 2_19_200);
expect(
  'expected payout = HX-1 option B insurer pays',
  cx1.expectedPayout,
  option(diff.primary, 'standard').policyPays,
);

heading('CX-1 variants (R-CLM-008)');
const flatClaim = assessClaim(
  CX1_LETTER,
  { ...CX1_BILL, roomRentPerDay: 9_000, billingType: 'flat' },
  PARENTS_POLICY,
);
const icuClaim = assessClaim(
  CX1_LETTER,
  { ...CX1_BILL, roomRentPerDay: 9_000, icuStay: true },
  PARENTS_POLICY,
);
const differentialAbove = assessClaim(
  CX1_LETTER,
  { ...CX1_BILL, roomRentPerDay: 9_000 },
  PARENTS_POLICY,
);
expect(
  'flat billing, room above limit',
  `${flatClaim.deductions[1]?.verdict} ${flatClaim.deductions[1]?.ruleId}`,
  'challengeable R-CLM-008',
);
expect(
  'ICU stay',
  `${icuClaim.deductions[1]?.verdict} ${icuClaim.deductions[1]?.ruleId}`,
  'challengeable R-CLM-008',
);
expect(
  'differential, room above limit',
  `${differentialAbove.deductions[1]?.verdict} ${differentialAbove.deductions[1]?.ruleId}`,
  'valid R-HL-001',
);

// ---------------------------------------------------------------- MX-1 maternity
heading('MX-1 normal delivery: room rent and the maternity cap both bite (R-HL-008, R-MT-001)');
const mx1 = evaluateHospital(MX1_CONTEXT, MX1_ESTIMATE);
printBranch('primary', mx1.primary);
expect('policy order', mx1.policyOrder.join(' > '), 'pol_gmc_startup > pol_supertopup');
expect('Non-AC bill (the room the family took)', option(mx1.primary, 'nonac').bill, 77_250);
expect('Non-AC room above limit (₹250 × 2)', deduction(mx1.primary, 'nonac', 'R-HL-008'), 500);
expect('no proportionate deduction: the group policy waives it', fired(mx1, 'R-HL-001'), false);
expect('Non-AC admissible', option(mx1.primary, 'nonac').admissible, 74_850);
expect('Non-AC insurer pays (capped)', option(mx1.primary, 'nonac').policyPays, 50_000);
expect('Non-AC out of pocket', option(mx1.primary, 'nonac').outOfPocket, 27_250);
expect(
  'above-limit deduction (Non-AC), as on the letter',
  deduction(mx1.primary, 'nonac', 'R-MT-001'),
  24_850,
);
expect('AC bill', option(mx1.primary, 'ac').bill, 88_950);
expect('AC room above limit (₹2,000 × 2)', deduction(mx1.primary, 'ac', 'R-HL-008'), 4_000);
expect('AC out of pocket', option(mx1.primary, 'ac').outOfPocket, 38_950);
expect('General Ward bill', option(mx1.primary, 'general').bill, 69_750);
expect('General Ward: no room deductions', option(mx1.primary, 'general').admissible, 67_850);
expect('General Ward out of pocket', option(mx1.primary, 'general').outOfPocket, 19_750);
expect('Twin Sharing out of pocket', option(mx1.primary, 'twin').outOfPocket, 23_850);
expect('recommended', mx1.primary.recommendedRoomCategoryId, 'general');
expect('saving (AC → General)', mx1.primary.saving, 19_200);
expect('R-MT-001 fired', fired(mx1, 'R-MT-001'), true);
const sayMx = buildDeskSay(mx1, 'en', { policyNames: { pol_gmc_startup: 'company policy' } });
console.log(`  say (en): ${sayMx}`);
expect('says the cap', sayMx.includes('pays at most ₹50,000 for a delivery'), true);
console.log(
  `  say (hi): ${buildDeskSay(mx1, 'hi', { policyNames: { pol_gmc_startup: 'company wali policy' } })}`,
);

heading('MX-1 variants: caesarean limit, waiting period, no maternity benefit (R-MT-002)');
const csec = evaluateHospital(MX1_CONTEXT, { ...MX1_ESTIMATE, treatment: 'maternity_csection' });
expect(
  'caesarean cap ₹75,000 (not binding on this bill)',
  option(csec.primary, 'general').policyPays,
  67_850,
);
const withWait = {
  ...STARTUP_POLICY,
  terms: {
    ...STARTUP_POLICY.terms,
    maternity: { ...STARTUP_POLICY.terms.maternity!, waitingMonths: 12 },
  },
};
const waiting = evaluateHospital({ ...MX1_CONTEXT, policies: [withWait] }, MX1_ESTIMATE);
expect('waiting period not served: pays nothing', option(waiting.primary, 'general').policyPays, 0);
expect('R-MT-002 fired', fired(waiting, 'R-MT-002'), true);
const sayWaiting = buildDeskSay(waiting, 'en', {
  policyNames: { pol_gmc_startup: 'company policy' },
});
console.log(`  say (en, waiting): ${sayWaiting}`);
expect('says the waiting period', sayWaiting.includes('waiting period'), true);
const noMaternity = {
  ...STARTUP_POLICY,
  terms: { ...STARTUP_POLICY.terms, maternity: undefined },
};
const noBenefit = evaluateHospital({ ...MX1_CONTEXT, policies: [noMaternity] }, MX1_ESTIMATE);
expect('no maternity benefit: pays nothing', option(noBenefit.primary, 'general').policyPays, 0);
const sayNoBenefit = buildDeskSay(noBenefit, 'en', {
  policyNames: { pol_gmc_startup: 'company policy' },
});
console.log(`  say (en, no benefit): ${sayNoBenefit}`);
expect(
  'says the policy does not cover a delivery',
  sayNoBenefit.includes('does not cover a delivery'),
  true,
);
const generalAdmission = evaluateHospital(MX1_CONTEXT, { ...MX1_ESTIMATE, treatment: 'general' });
expect(
  'same bill as a general admission: no cap',
  option(generalAdmission.primary, 'general').policyPays,
  67_850,
);

heading('MX-1 claim: nothing to appeal (R-HL-008, R-CLM-009)');
const mxClaim = assessClaim(MX1_LETTER, MX1_BILL, STARTUP_POLICY);
for (const d of mxClaim.deductions) {
  console.log(
    `  ${d.verdict.padEnd(13)} ${formatInr(d.amount).padStart(8)} -> recoverable ${formatInr(d.recoverable).padStart(7)}  ${d.ruleId}  ${d.label}: ${d.reason}`,
  );
}
expect('non-payable is valid', mxClaim.deductions[0]?.verdict, 'valid');
expect(
  'room excess is valid (R-HL-008)',
  `${mxClaim.deductions[1]?.verdict} ${mxClaim.deductions[1]?.ruleId}`,
  'valid R-HL-008',
);
expect(
  'ailment limit is valid (R-CLM-009)',
  `${mxClaim.deductions[2]?.verdict} ${mxClaim.deductions[2]?.ruleId}`,
  'valid R-CLM-009',
);
expect('approved matches the letter', mxClaim.approved, 50_000);
expect('recoverable', mxClaim.recoverable, 0);
expect(
  'out of pocket equals the desk answer for the Non-AC room',
  MX1_BILL.total - mxClaim.expectedPayout,
  option(mx1.primary, 'nonac').outOfPocket,
);

heading('MX-1 claim variants: a cut above the cap, and a sub-limit the policy does not have (#23)');
const overCut = assessClaim(
  {
    ...MX1_LETTER,
    approvedAmount: 34_850,
    deductions: MX1_LETTER.deductions.map((d, i) => (i === 2 ? { ...d, amount: 40_000 } : d)),
  },
  MX1_BILL,
  STARTUP_POLICY,
);
expect(
  'a cut above the cap is challengeable (R-CLM-009)',
  `${overCut.deductions[2]?.verdict} ${overCut.deductions[2]?.ruleId}`,
  'challengeable R-CLM-009',
);
expect('only the excess over the cap is recoverable', overCut.recoverable, 15_150);
const cataract = assessClaim(
  {
    ...MX1_LETTER,
    deductions: [
      { label: 'Cataract sub-limit', amount: 10_000, reasonGiven: 'Cataract limited per eye' },
    ],
  },
  MX1_BILL,
  STARTUP_POLICY,
);
expect(
  'a sub-limit the terms do not show is possibly recoverable (R-CLM-006)',
  `${cataract.deductions[0]?.verdict} ${cataract.deductions[0]?.ruleId}`,
  'possibly R-CLM-006',
);

// ---------------------------------------------------------------- SX-1 Singapore
heading('SX-1 Singapore: a Class B1 plan with a rider, offered Class A (R-SG-003 to R-SG-006)');
const sx1 = evaluateHospital(SX1_CONTEXT, SX1_ESTIMATE);
printBranch('primary', sx1.primary);
expect(
  'policy order: the plan, then MediShield Life',
  sx1.policyOrder.join(' > '),
  'pol_ip_ahkow > pol_mshl_ahkow',
);
expect('Class B1 bill', option(sx1.primary, 'b1').bill, 21_100);
expect(
  'Class B1 claimable (as charged, less non-payables)',
  option(sx1.primary, 'b1').admissible,
  21_040,
);
expect('Class B1 co-payment (5% with the rider)', option(sx1.primary, 'b1').copay, 927);
expect('Class B1 out of pocket', option(sx1.primary, 'b1').outOfPocket, 987);
expect('Class A bill', option(sx1.primary, 'a').bill, 26_770);
expect('Class A claimable (pro-rated to 50%)', option(sx1.primary, 'a').admissible, 13_325);
expect('Class A pro-ration deduction', deduction(sx1.primary, 'a', 'R-SG-005'), 13_325);
expect('Class A out of pocket', option(sx1.primary, 'a').outOfPocket, 13_986);
expect('recommended: Class B1', sx1.primary.recommendedRoomCategoryId, 'b1');
expect('saving (A → B1)', sx1.primary.saving, 12_999);
expect('no panel question: the cap never binds on this bill', sx1.questionForDesk, undefined);
expect('R-SG-006 fired', fired(sx1, 'R-SG-006'), true);
const saySx = buildDeskSay(sx1, 'en', {
  country: 'SG',
  policyNames: { pol_ip_ahkow: 'Shield plan', pol_mshl_ahkow: 'MediShield Life' },
});
console.log(`  say (en): ${saySx}`);
expect('speaks Singapore dollars', saySx.includes('S$12,999'), true);
console.log(
  `  say (zh): ${buildDeskSay(sx1, 'zh', { country: 'SG', policyNames: { pol_ip_ahkow: 'Shield 综合健保计划' } })}`,
);

heading('SX-2 Singapore: MediShield Life alone (R-SG-001, R-SG-002)');
const sx2 = evaluateHospital({ ...SX1_CONTEXT, policies: [MEDISHIELD_AHKOW] }, SX1_ESTIMATE);
expect('policy order', sx2.policyOrder.join(' > '), 'pol_mshl_ahkow');
expect('Class B1 pays something', option(sx2.primary, 'b1').policyPays > 0, true);
expect(
  'Class B1 out of pocket is most of the bill',
  option(sx2.primary, 'b1').outOfPocket > 15_000,
  true,
);
expect('R-SG-001 fired', fired(sx2, 'R-SG-001'), true);

// ---------------------------------------------------------------- PX-1 (docs/plan/05 §11)
heading('PX-1 Sharma plan before and after the job change');
const sharma = Household.parse({
  ...persona.household,
  asOf: persona.checkpoints.setup.asOf,
  policies: persona.checkpoints.setup.policies.map(
    (id) => persona.policies[id as keyof typeof persona.policies],
  ),
});
const JOB_CHANGE: ChangeSet = {
  summary: 'Rahul leaves Acme Software on 30 Nov and joins Orbit Labs on 1 Dec',
  effectiveDate: '2026-12-01',
  needsConfirmation: false,
  unrecognised: [],
  changes: [
    {
      type: 'employment_ended',
      memberId: 'mem_rahul',
      employer: 'Acme Software',
      lastDay: '2026-11-30',
    },
    {
      type: 'employment_started',
      memberId: 'mem_rahul',
      employer: 'Orbit Labs',
      startDate: '2026-12-01',
      groupHealth: {
        offered: 'yes',
        sumInsured: 3_00_000,
        coveredMemberIds: ['mem_rahul', 'mem_priya', 'mem_anaya'],
      },
    },
  ],
};
const printPlan = (p: Plan) => {
  console.log(
    `  [${p.asOf}] score ${p.coverMap.score}, spend ${formatInr(p.monthlySpend)} of ${formatInr(p.budget.forNewMonthly)}`,
  );
  for (const r of p.recommendations)
    console.log(
      `    ${r.status.padEnd(8)} ${r.id.padEnd(48)} ${formatInr(r.cover).padStart(12)}  ${formatInr(r.premiumMonthly).padStart(7)}/mo  urgency ${r.urgency}${r.deferReason ? `  (${r.deferReason})` : ''}`,
    );
};
const cellStatus = (p: Plan, memberId: string, risk: string) =>
  p.coverMap.cells.find((c) => c.memberId === memberId && c.risk === risk)?.status;
const rec = (p: Plan, id: string) => p.recommendations.find((r) => r.id === id);

const v1 = plan(sharma, '2026-10-14');
printPlan(v1);
expect('budget total', v1.budget.totalMonthly, 17_400);
expect('existing personal premiums', v1.budget.existingPremiumsMonthly, 6_975);
expect('budget for new', v1.budget.forNewMonthly, 10_425);
expect('term life cover (R-LF-001)', rec(v1, 'term_life:mem_rahul')?.cover, 4_00_00_000);
expect('term life ₹/mo', rec(v1, 'term_life:mem_rahul')?.premiumMonthly, 4_000);
expect('v1 spend', v1.monthlySpend, 7_000);
expect('v1 device selected', rec(v1, 'device:asset_phone')?.status, 'selected');
expect(
  'v1 parents deferred (employer cover)',
  `${rec(v1, 'parents_health:mem_suresh+mem_kamala')?.status} ${rec(v1, 'parents_health:mem_suresh+mem_kamala')?.deferReason}`,
  'deferred employer_cover',
);
expect('v1 Suresh health', cellStatus(v1, 'mem_suresh', 'health'), 'contingent');
expect('v1 Priya life', cellStatus(v1, 'mem_priya', 'life'), 'na');

const changed = applyChangeSet(sharma, JOB_CHANGE);
const v2 = plan(changed, '2026-12-01');
printPlan(v2);
expect('1 Dec Suresh health', cellStatus(v2, 'mem_suresh', 'health'), 'gap');
expect('1 Dec Kamala health', cellStatus(v2, 'mem_kamala', 'health'), 'gap');
expect(
  'top-up without base',
  v2.coverMap.cells.find((c) => c.memberId === 'mem_suresh' && c.risk === 'health')?.issues.join(),
  'topup_without_base',
);
expect('1 Dec Rahul health (startup ₹3L)', cellStatus(v2, 'mem_rahul', 'health'), 'partial');
expect(
  '30 Nov Suresh still on Acme',
  cellStatus(plan(changed, '2026-11-30'), 'mem_suresh', 'health'),
  'contingent',
);
expect('v2 parents ₹/mo', rec(v2, 'parents_health:mem_suresh+mem_kamala')?.premiumMonthly, 4_167);
expect(
  'v2 parents via migration',
  rec(v2, 'parents_health:mem_suresh+mem_kamala')?.via,
  'migration',
);
expect('v2 spend', v2.monthlySpend, 10_417);
expect('v2 device deferred (budget)', rec(v2, 'device:asset_phone')?.deferReason, 'budget');

const d = planDiff(v1, v2);
console.log(
  `  diff: +${d.added.map((r) => r.id).join(', +')}  -${d.removed.map((r) => r.id).join(', -')}; score ${d.score.before} → ${d.score.after}`,
);
expect(
  'diff adds parents',
  d.added.map((r) => r.id).join(),
  'parents_health:mem_suresh+mem_kamala',
);
expect('diff removes device', d.removed.map((r) => r.id).join(), 'device:asset_phone');
expect('diff spend', `${d.monthlySpend.before} → ${d.monthlySpend.after}`, '7000 → 10417');
expect('score drops', d.score.after < d.score.before, true);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
