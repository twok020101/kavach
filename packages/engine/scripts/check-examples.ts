/**
 * Runs the worked examples (HX-1 in every billing branch, an ICU case, CX-1) through the engine,
 * prints the results and exits non-zero if any number differs from the plan.
 * Run: pnpm --filter @kavach/engine check
 */
import type { BranchResult, DeskEvaluation } from '@kavach/schemas';
import { assessClaim, buildDeskSay, evaluateHospital, formatInr, hindiWords } from '../src/index';
import {
  CX1_BILL,
  CX1_LETTER,
  HX1_CONTEXT,
  ICU_CONTEXT,
  ICU_ESTIMATE,
  PARENTS_POLICY,
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

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
