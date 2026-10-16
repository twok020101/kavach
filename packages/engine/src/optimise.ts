import type {
  CoverCell,
  CoverMap,
  Household,
  Member,
  Recommendation,
  RecommendationCategory,
  RuleFiring,
} from '@kavach/schemas';
import { daysBetween } from './cover-map';
import { isNuclear, isParent, weight } from './needs';
import { fire } from './rules';

/**
 * Illustrative premiums (₹/year), labelled as such on every screen. Not a quote from any insurer.
 * Sizes and prices follow docs/plan/05 §11 (PX-1).
 */
export const CATALOG = {
  termPerCrore: (age: number) => (age < 40 ? 12_000 : age < 50 ? 24_000 : 48_000),
  familyHealth: { cover: 10_00_000, premium: 22_000 },
  parentsHealth: { cover: 5_00_000, premium: 50_000 },
  accidentPer10Lakh: 1_000,
  /** Device protection per year, as a share of the device's value. */
  deviceRate: 0.05,
} as const;

const TERM_STEP = 25_00_000;
const PA_MINIMUM_AT_HIGH_INCOME = 50_00_000;
const DEVICE_MIN_VALUE = 50_000;
const DEVICE_MAX_AGE_DAYS = 2 * 365;
/** A contingent cell becomes urgent when its employer cover ends within this many days. */
const URGENT_WITHIN_DAYS = 60;

/** A possible recommendation, with the cells it closes and its weighted value (R-OP-001). */
type Candidate = {
  rec: Omit<Recommendation, 'status' | 'deferReason'>;
  cells: CoverCell[];
  value: number;
};

const roundUp = (amount: number, step: number) => Math.ceil(amount / step) * step;

/** What part of a cell's need is not met by the family's own (personal + statutory) cover. */
const atRisk = (cell: CoverCell) =>
  Math.max(0, cell.need - cell.have.personal - cell.have.statutory);

/** R-OP-001 urgency: gaps 1; contingent 0.5, or 2 when the employer cover ends within 60 days. */
function urgency(cell: CoverCell, asOf: string): number {
  if (cell.status === 'contingent') {
    const ends = cell.employerCoverEnds;
    return ends && daysBetween(asOf, ends) <= URGENT_WITHIN_DAYS ? 2 : 0.5;
  }
  return cell.status === 'gap' || cell.status === 'partial' ? 1 : 0;
}

function candidate(
  household: Household,
  asOf: string,
  category: RecommendationCategory,
  members: Member[],
  cells: CoverCell[],
  cover: number,
  premiumAnnual: number,
  ruleIds: string[],
  extra: Partial<Recommendation> = {},
): Candidate {
  const closed = cells.map((c) => Math.min(cover, atRisk(c)));
  const value = cells.reduce(
    (sum, c, i) => sum + weight(members.find((m) => m.id === c.memberId)!, c.risk) * closed[i]!,
    0,
  );
  const rec = {
    id: `${category}:${members.map((m) => m.id).join('+')}`,
    category,
    memberIds: members.map((m) => m.id),
    cover,
    premiumAnnual,
    premiumMonthly: Math.round(premiumAnnual / 12),
    gapClosed: closed.reduce((a, b) => a + b, 0),
    urgency: Math.max(0, ...cells.map((c) => urgency(c, asOf))),
    via: 'new' as const,
    ruleIds: [...new Set([...cells.flatMap((c) => c.ruleIds), ...ruleIds, 'R-OP-001'])],
    ...extra,
  };
  return { rec, cells, value };
}

/** Builds one candidate per open need, from the illustrative catalog. */
function candidates(household: Household, map: CoverMap): Candidate[] {
  const asOf = map.asOf;
  const open = (cell: CoverCell) => cell.status !== 'covered' && cell.status !== 'na';
  const cellsFor = (risk: CoverCell['risk'], members: Member[]) =>
    map.cells.filter((c) => c.risk === risk && members.some((m) => m.id === c.memberId) && open(c));
  const memberOf = (cell: CoverCell) => household.members.find((m) => m.id === cell.memberId)!;
  const out: Candidate[] = [];

  for (const cell of map.cells.filter((c) => c.risk === 'life' && open(c))) {
    const member = memberOf(cell);
    const existing = cell.have.personal + cell.have.statutory + cell.have.employer;
    const cover = roundUp(cell.need - existing, TERM_STEP);
    const premium = Math.round((cover / 1_00_00_000) * CATALOG.termPerCrore(member.age));
    out.push(candidate(household, asOf, 'term_life', [member], [cell], cover, premium, []));
  }

  const nuclear = household.members.filter(isNuclear);
  const nuclearCells = cellsFor('health', nuclear);
  if (nuclearCells.length) {
    const { cover, premium } = CATALOG.familyHealth;
    out.push(
      candidate(household, asOf, 'family_health', nuclear, nuclearCells, cover, premium, []),
    );
  }

  const parents = household.members.filter(isParent);
  const parentCells = cellsFor('health', parents);
  if (parentCells.length) {
    const { cover, premium } = CATALOG.parentsHealth;
    // Parents on an employer group policy can move to an individual policy when it ends (R-MG-001).
    const group = household.policies.find(
      (p) =>
        p.kind === 'group_health' &&
        p.source === 'employer' &&
        parents.some((m) => p.coveredMemberIds.includes(m.id)),
    );
    out.push(
      candidate(
        household,
        asOf,
        'parents_health',
        parents,
        parentCells,
        cover,
        premium,
        group ? ['R-MG-001'] : [],
        group ? { via: 'migration', employer: group.employer } : {},
      ),
    );
  }

  for (const cell of map.cells.filter((c) => c.risk === 'accident' && open(c))) {
    const member = memberOf(cell);
    const income = household.finances?.annualIncome ?? 0;
    const cover = Math.min(
      cell.need,
      income >= 15_00_000 ? PA_MINIMUM_AT_HIGH_INCOME : roundUp(cell.need, 10_00_000),
    );
    const premium = (cover / 10_00_000) * CATALOG.accidentPer10Lakh;
    out.push(candidate(household, asOf, 'personal_accident', [member], [cell], cover, premium, []));
  }

  for (const asset of household.assets.filter((a) => a.kind === 'device')) {
    const recent = !asset.purchasedOn || daysBetween(asset.purchasedOn, asOf) <= DEVICE_MAX_AGE_DAYS;
    if (asset.value < DEVICE_MIN_VALUE || !recent) continue;
    const premiumAnnual = Math.round(asset.value * CATALOG.deviceRate);
    out.push({
      rec: {
        id: `device:${asset.id}`,
        category: 'device',
        memberIds: [],
        cover: asset.value,
        premiumAnnual,
        premiumMonthly: Math.round(premiumAnnual / 12),
        gapClosed: asset.value,
        urgency: 1,
        via: 'new',
        assetLabel: asset.label,
        ruleIds: ['R-DV-001', 'R-OP-001'],
      },
      cells: [],
      value: 0.2 * asset.value,
    });
  }
  return out;
}

/**
 * R-OP-001: rank by urgency, then weighted need closed per rupee; choose while the budget allows.
 * What doesn't fit is deferred: "employer cover" when the need is met by a job for now, else "budget".
 */
export function optimise(
  household: Household,
  map: CoverMap,
  budgetForNew: number,
): { recommendations: Recommendation[]; trace: RuleFiring } {
  const efficiency = (c: Candidate) => c.value / c.rec.premiumMonthly;
  const ranked = candidates(household, map).sort(
    (a, b) => b.rec.urgency - a.rec.urgency || efficiency(b) - efficiency(a),
  );
  let spend = 0;
  const recommendations = ranked.map(({ rec, cells }): Recommendation => {
    if (spend + rec.premiumMonthly <= budgetForNew) {
      spend += rec.premiumMonthly;
      return { ...rec, status: 'selected' };
    }
    const onlyContingent = cells.length > 0 && cells.every((c) => c.status === 'contingent');
    return { ...rec, status: 'deferred', deferReason: onlyContingent ? 'employer_cover' : 'budget' };
  });
  return {
    recommendations,
    trace: fire(
      'R-OP-001',
      { budgetForNew, order: ranked.map((c) => c.rec.id) },
      {
        selected: recommendations.filter((r) => r.status === 'selected').map((r) => r.id),
        monthlySpend: spend,
      },
    ),
  };
}
