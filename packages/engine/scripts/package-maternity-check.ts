/**
 * A maternity package poster (Standard / Deluxe / Premium, one price per package) run through the
 * engine with the maternity cap: the cheapest package is covered in full, the others leave a gap,
 * and nothing needs asking at the desk because every package price is printed.
 * Run: pnpm --filter @kavach/engine exec tsx scripts/package-maternity-check.ts
 */
import type { HospitalEstimate } from '@kavach/schemas';
import { buildDeskSay, evaluateHospital, formatInr } from '../src/index';
import { MX1_CONTEXT } from '../src/examples';

const poster: HospitalEstimate = {
  hospitalName: 'Sunrise Care Multispeciality Hospital',
  procedure: 'Normal delivery (package)',
  treatment: 'maternity_normal',
  admissionType: 'planned',
  days: 2,
  billingType: 'package',
  roomCategories: [
    { id: 'standard', label: 'Standard Package · Shared Room', rentPerDay: 0 },
    { id: 'deluxe', label: 'Deluxe Package · Private Room', rentPerDay: 0 },
    { id: 'premium', label: 'Premium Package · Private Room', rentPerDay: 0 },
  ],
  lines: [],
  packagePrices: { standard: 45_000, deluxe: 55_000, premium: 75_000 },
  needsConfirmation: false,
  notes: ['Price list, not a patient estimate; prices are indicative'],
};

const ev = evaluateHospital(MX1_CONTEXT, poster);
let failures = 0;
const expect = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${String(actual)}${ok ? '' : ` (expected ${String(expected)})`}`,
  );
};
for (const o of ev.primary.options) {
  console.log(
    `  ${o.label.padEnd(32)} bill ${formatInr(o.bill).padStart(9)}  insurer ${formatInr(o.policyPays).padStart(9)}  you pay ${formatInr(o.outOfPocket).padStart(9)}`,
  );
}
const option = (id: string) => ev.primary.options.find((o) => o.roomCategoryId === id)!;
expect('standard: covered in full', option('standard').outOfPocket, 0);
expect('deluxe: ₹5,000 above the cap', option('deluxe').outOfPocket, 5_000);
expect('premium: ₹25,000 above the cap', option('premium').outOfPocket, 25_000);
expect('recommended', ev.primary.recommendedRoomCategoryId, 'standard');
expect('no desk question (all packages priced)', ev.questionForDesk, undefined);
console.log(
  `  say (en): ${buildDeskSay(ev, 'en', { policyNames: { pol_gmc_startup: 'company policy' } })}`,
);
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll package checks passed');
process.exit(failures ? 1 : 0);
