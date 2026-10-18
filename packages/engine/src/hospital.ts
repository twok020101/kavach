import type {
  BillingType,
  BranchResult,
  DeskEvaluation,
  EstimateLine,
  HospitalEstimate,
  LineHead,
  Policy,
  RoomCategory,
  RoomOptionResult,
  RuleFiring,
  Treatment,
} from '@kavach/schemas';
import { formatInr, roundRupees } from './money';
import { fire } from './rules';

/** Who is in hospital and which policies cover them. */
export type HospitalContext = {
  patient: { age: number; memberId?: string };
  /** The household's policies; only health cover for this patient, in force on asOf, is used. */
  policies: Policy[];
  /** ISO date of the admission. When set, policies not in force on this date are ignored. */
  asOf?: string;
};

const HEALTH_KINDS: readonly Policy['kind'][] = ['group_health', 'retail_health', 'super_top_up'];

type Mode = Exclude<BillingType, 'unknown'>;
type Deduction = RoomOptionResult['deductions'][number];

/** Heads the proportionate deduction never touches (R-HL-001, R-HL-002). */
const NEVER_RATIO: readonly LineHead[] = [
  'implant',
  'pharmacy',
  'consumables',
  'diagnostics',
  'icu',
  'non_payable',
];

/** One room category with the amount the hospital charges for each line in it. */
type PricedOption = {
  room: RoomCategory;
  lines: { line: EstimateLine; amount: number; days: number }[];
  bill: number;
};

type Admissible = { admissible: number; deductions: Deduction[]; trace: RuleFiring[] };

export function evaluateHospital(
  ctx: HospitalContext,
  estimate: HospitalEstimate,
  roomOptions: RoomCategory[] = [],
): DeskEvaluation {
  const policies = coveringPolicies(ctx);
  if (policies.length === 0) throw new Error('No policy covers this patient');

  const rooms = [...estimate.roomCategories];
  for (const extra of roomOptions) if (!rooms.some((r) => r.id === extra.id)) rooms.push(extra);

  const orders = permutations(sortByPreference(policies));
  const run = (mode: Mode) => bestOrder(ctx, estimate, rooms, orders, mode);

  const trace: RuleFiring[] = [];
  let primary: Run;
  let alternate: Run | undefined;
  let questionForDesk: string | undefined;

  switch (estimate.billingType) {
    case 'unknown':
      primary = run('differential');
      alternate = run('flat');
      questionForDesk = sameChargesQuestion(estimate, rooms, policies);
      trace.push(
        fire(
          'R-HL-010',
          { billingType: 'unknown' },
          {
            differentialSaving: primary.branch.saving,
            flatSaving: alternate.branch.saving,
            questionForDesk,
          },
        ),
      );
      break;
    case 'package': {
      primary = run('package');
      // One question only when the lower room's package price is not on the estimate.
      const priced = Object.keys(estimate.packagePrices ?? {});
      const lower = lowerRoom(rooms, policies);
      if (!priced.includes(lower.id)) questionForDesk = packageQuestion(estimate, rooms, policies);
      trace.push(
        fire('R-HL-014', { billingType: 'package', pricedRooms: priced }, { questionForDesk }),
      );
      break;
    }
    default:
      primary = run(estimate.billingType);
  }

  trace.push(...primary.trace, ...(alternate?.trace ?? []));
  return {
    policyOrder: primary.order.map((p) => p.id),
    primary: primary.branch,
    alternate: alternate?.branch,
    questionForDesk,
    trace,
  };
}

type Run = { order: Policy[]; branch: BranchResult; trace: RuleFiring[] };

/** R-HL-006: try every policy order and keep the one with the lowest out-of-pocket. */
function bestOrder(
  ctx: HospitalContext,
  estimate: HospitalEstimate,
  rooms: RoomCategory[],
  orders: Policy[][],
  mode: Mode,
): Run {
  const priced = rooms
    .map((room) => priceOption(estimate, room, mode))
    .filter((o): o is PricedOption => o !== undefined);

  let best: Run | undefined;
  let bestKey: [number, number] = [Infinity, Infinity];
  const tried: { order: string[]; outOfPocket: number }[] = [];

  for (const order of orders) {
    const trace: RuleFiring[] = [];
    const options = priced.map((o) => settle(ctx, o, order, mode, trace, estimate.treatment));
    const recommended = options.reduce((a, b) =>
      b.outOfPocket < a.outOfPocket ||
      (b.outOfPocket === a.outOfPocket && b.rentPerDay < a.rentPerDay)
        ? b
        : a,
    );
    const worst = Math.max(...options.map((o) => o.outOfPocket));
    const key: [number, number] = [recommended.outOfPocket, sum(options.map((o) => o.outOfPocket))];
    tried.push({ order: order.map((p) => p.id), outOfPocket: recommended.outOfPocket });

    // Strict comparison keeps the earlier (preferred) order on a tie.
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
      bestKey = key;
      best = {
        order,
        trace,
        branch: {
          billingType: mode,
          options,
          recommendedRoomCategoryId: recommended.roomCategoryId,
          saving: worst - recommended.outOfPocket,
        },
      };
    }
  }

  if (!best) throw new Error('No room option could be priced');
  best.trace.unshift(
    fire(
      'R-HL-006',
      { billingType: mode, ordersTried: tried },
      { policyOrder: best.order.map((p) => p.id) },
    ),
  );
  return best;
}

/** The bill for one room category under the given billing mode. */
function priceOption(
  estimate: HospitalEstimate,
  room: RoomCategory,
  mode: Mode,
): PricedOption | undefined {
  const quoted = estimate.roomCategories[0]!;
  const lines = estimate.lines.map((line) => {
    const own = line.amounts[room.id];
    const days = line.days ?? estimate.days;
    let amount: number;
    if (line.head === 'room') amount = own ?? room.rentPerDay * days;
    // Flat billing: only the room rent changes, every other head stays as quoted.
    else if (mode !== 'flat' && own !== undefined) amount = own;
    else amount = line.amounts[quoted.id] ?? 0;
    return { line, amount, days };
  });

  if (mode === 'package') {
    const price = estimate.packagePrices?.[room.id];
    if (price !== undefined) return { room, lines, bill: price };
    // Without a package price we can only price the room the estimate was quoted for.
    if (room.id !== quoted.id) return undefined;
  }
  return { room, lines, bill: sum(lines.map((l) => l.amount)) };
}

/** Runs the policies in order over one priced option. */
function settle(
  ctx: HospitalContext,
  option: PricedOption,
  order: Policy[],
  mode: Mode,
  trace: RuleFiring[],
  treatment: Treatment = 'general',
): RoomOptionResult {
  const { room, bill } = option;
  let paid = 0;
  let first: (Admissible & { copay: number }) | undefined;
  const policyShares: RoomOptionResult['policyShares'] = [];

  for (const policy of order) {
    const adm = admissible(option, policy, mode);
    const rate = copayRate(policy, ctx.patient.age);
    const copay = roundRupees((adm.admissible * rate) / 100);
    const eligible = maternityCap(ctx, treatment, policy, room.id, adm, copay, trace);
    const deductible = policy.terms.deductible;
    const siLeft = Math.max(0, policy.sumInsured - policy.claimsUsedThisYear);
    // Amounts already paid by earlier policies count toward a top-up's deductible (R-HL-009).
    const pays = Math.max(0, Math.min(siLeft, eligible - Math.max(paid, deductible), bill - paid));
    paid += pays;
    policyShares.push({ policyId: policy.id, pays });

    if (!first) first = { ...adm, copay };
    if (rate > 0) {
      trace.push(
        fire(
          'R-HL-003',
          {
            roomCategoryId: room.id,
            policyId: policy.id,
            admissible: adm.admissible,
            copayPercent: rate,
          },
          { copay },
        ),
      );
    }
    if (deductible > 0) {
      trace.push(
        fire(
          'R-HL-009',
          {
            roomCategoryId: room.id,
            policyId: policy.id,
            deductible,
            eligible,
            paidBefore: paid - pays,
          },
          { pays },
        ),
      );
    }
    trace.push(...adm.trace);
  }

  return {
    roomCategoryId: room.id,
    label: room.label,
    rentPerDay: room.rentPerDay,
    bill,
    admissible: first!.admissible,
    deductions: first!.deductions,
    copay: first!.copay,
    policyPays: paid,
    outOfPocket: bill - paid,
    policyShares,
  };
}

/** What one policy treats as admissible for this option, with each deduction and the rule behind it. */
function admissible(option: PricedOption, policy: Policy, mode: Mode): Admissible {
  const { room, lines, bill } = option;
  const terms = policy.terms;
  const deductions: Deduction[] = [];
  const trace: RuleFiring[] = [];
  const ctx = { roomCategoryId: room.id, policyId: policy.id };

  const nonPayable = sum(lines.filter((l) => l.line.head === 'non_payable').map((l) => l.amount));
  if (nonPayable > 0) {
    deductions.push({ ruleId: 'R-HL-005', label: 'Non-payable items', amount: nonPayable });
    trace.push(fire('R-HL-005', ctx, { deducted: nonPayable }));
  }

  // R-HL-014: a package is one price; Kavach applies no ratio or cap itself.
  if (mode === 'package') return { admissible: bill - nonPayable, deductions, trace };

  const limit = terms.roomRentLimitPerDay ?? Infinity;
  const overLimit = room.rentPerDay > limit;
  const applyRatio = mode === 'differential' && terms.proportionateDeduction && overLimit;
  let admissibleTotal = 0;
  let ratioBase = 0;

  for (const { line, amount, days } of lines) {
    const ruleCtx = { ...ctx, head: line.head, amount };
    if (line.head === 'non_payable') continue;

    if (line.head === 'room' && overLimit) {
      const payable = Math.min(amount, limit * days);
      admissibleTotal += payable;
      if (amount > payable) {
        const excess = amount - payable;
        deductions.push({ ruleId: 'R-HL-008', label: 'Room rent above limit', amount: excess });
        trace.push(
          fire(
            'R-HL-008',
            { ...ruleCtx, rentPerDay: room.rentPerDay, limit, days },
            { payable, excess },
          ),
        );
      }
    } else if (line.head === 'icu') {
      // R-HL-002: ICU is only ever capped at its own limit, never cut by the room ratio.
      const icuLimit = terms.icuLimitPerDay;
      const payable = icuLimit === undefined ? amount : Math.min(amount, icuLimit * days);
      admissibleTotal += payable;
      if (amount > payable) {
        deductions.push({
          ruleId: 'R-HL-002',
          label: 'ICU rent above ICU limit',
          amount: amount - payable,
        });
      }
      trace.push(
        fire(
          'R-HL-002',
          { ...ruleCtx, icuLimitPerDay: icuLimit, days },
          { payable, proportionateDeduction: 0 },
        ),
      );
    } else if (applyRatio && line.pricedByRoom && !NEVER_RATIO.includes(line.head)) {
      ratioBase += amount;
    } else {
      admissibleTotal += amount;
    }
  }

  if (ratioBase > 0) {
    const payable = roundRupees((ratioBase * limit) / room.rentPerDay);
    admissibleTotal += payable;
    deductions.push({
      ruleId: 'R-HL-001',
      label: 'Proportionate deduction',
      amount: ratioBase - payable,
    });
    trace.push(
      fire(
        'R-HL-001',
        { ...ctx, roomPricedHeads: ratioBase, limit, rentPerDay: room.rentPerDay },
        { payable, deduction: ratioBase - payable },
      ),
    );
  }

  return { admissible: admissibleTotal, deductions, trace };
}

/**
 * R-MT-001 / R-MT-002: for a delivery, what one policy pays is capped at its maternity limit
 * (after the other deductions and co-pay); nothing until the waiting period is served; nothing
 * when the policy has no maternity benefit. Returns the amount the policy may pay.
 */
function maternityCap(
  ctx: HospitalContext,
  treatment: Treatment,
  policy: Policy,
  roomCategoryId: string,
  adm: Admissible,
  copay: number,
  trace: RuleFiring[],
): number {
  const eligible = adm.admissible - copay;
  if (treatment === 'general') return eligible;
  const m = policy.terms.maternity;
  const ruleCtx = { roomCategoryId, policyId: policy.id, treatment, eligible };

  if (!m) {
    adm.deductions.push({ ruleId: 'R-MT-001', label: 'No maternity benefit', amount: eligible });
    trace.push(fire('R-MT-001', { ...ruleCtx, limit: 0 }, { pays: 0, capped: true }));
    return 0;
  }

  const since = policy.continuousCoverSince ?? policy.startDate;
  const servedOn = addMonths(since, m.waitingMonths);
  if (ctx.asOf && m.waitingMonths > 0 && servedOn > ctx.asOf) {
    adm.deductions.push({
      ruleId: 'R-MT-002',
      label: 'Maternity waiting period not over',
      amount: eligible,
    });
    trace.push(
      fire(
        'R-MT-002',
        { ...ruleCtx, coverSince: since, waitingMonths: m.waitingMonths, servedOn },
        { pays: 0 },
      ),
    );
    return 0;
  }

  const limit =
    treatment === 'maternity_csection' ? (m.limitCsection ?? m.limitNormal) : m.limitNormal;
  const capped = eligible > limit;
  if (capped) {
    adm.deductions.push({
      ruleId: 'R-MT-001',
      label: 'Above maternity limit',
      amount: eligible - limit,
    });
  }
  trace.push(
    fire(
      'R-MT-001',
      { ...ruleCtx, limit, newbornDays: m.newbornDays },
      { pays: Math.min(eligible, limit), capped, aboveLimit: Math.max(0, eligible - limit) },
    ),
  );
  return Math.min(eligible, limit);
}

/** ISO date plus whole months (clamped to the month's last day). */
function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

function copayRate(policy: Policy, age: number): number {
  const from = policy.terms.copayFromAge;
  return from === undefined || age >= from ? policy.terms.copayPercent : 0;
}

function coveringPolicies(ctx: HospitalContext): Policy[] {
  const { memberId } = ctx.patient;
  const { asOf } = ctx;
  return ctx.policies.filter(
    (p) =>
      HEALTH_KINDS.includes(p.kind) &&
      (memberId === undefined || p.coveredMemberIds.includes(memberId)) &&
      (asOf === undefined || (p.startDate <= asOf && p.endDate >= asOf)),
  );
}

/** Preferred order on ties: employer cover first (keeps the personal bonus), super top-ups last. */
function sortByPreference(policies: Policy[]): Policy[] {
  const rank = (p: Policy) => (p.kind === 'super_top_up' ? 2 : p.source === 'employer' ? 0 : 1);
  return [...policies].sort((a, b) => rank(a) - rank(b));
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

/** The best room within the tightest room-rent limit, else the cheapest room. */
function lowerRoom(rooms: RoomCategory[], policies: Policy[]): RoomCategory {
  const limits = policies.map((p) => p.terms.roomRentLimitPerDay).filter((l) => l !== undefined);
  const limit = limits.length ? Math.min(...limits) : Infinity;
  const byRent = [...rooms].sort((a, b) => a.rentPerDay - b.rentPerDay);
  return [...byRent].reverse().find((r) => r.rentPerDay <= limit) ?? byRent[0]!;
}

const roomName = (r: RoomCategory) => `${r.label} (${formatInr(r.rentPerDay)}/day)`;

function sameChargesQuestion(
  estimate: HospitalEstimate,
  rooms: RoomCategory[],
  policies: Policy[],
): string {
  const quoted = estimate.roomCategories[0]!;
  const lower = lowerRoom(rooms, policies);
  return `Are the surgeon, OT, nursing and doctor charges in the ${roomName(lower)} room different from the ${roomName(quoted)} room, or the same for every room?`;
}

function packageQuestion(
  estimate: HospitalEstimate,
  rooms: RoomCategory[],
  policies: Policy[],
): string {
  return `What is the package price for ${estimate.procedure} in the ${roomName(lowerRoom(rooms, policies))} room?`;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
