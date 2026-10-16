import type {
  CellIssue,
  CellStatus,
  CoverCell,
  CoverMap,
  Household,
  Member,
  Policy,
  Risk,
} from '@kavach/schemas';
import { needs, weight } from './needs';

const HEALTH_BASE: readonly Policy['kind'][] = ['group_health', 'retail_health'];
const LIFE_KINDS: readonly Policy['kind'][] = ['term_life', 'endowment'];

/** ISO date arithmetic in UTC: addDays('2026-11-30', 1) → '2026-12-01'. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export const inForce = (policy: Policy, asOf: string) =>
  policy.startDate <= asOf && asOf <= policy.endDate;

const layerOf = (policy: Policy) => (policy.source === 'employer' ? 'employer' : 'personal');

/** What one member has for one risk, by layer, plus the issues found. */
function have(member: Member, risk: Risk, policies: Policy[]) {
  const amounts = { statutory: 0, employer: 0, personal: 0 };
  const issues: CellIssue[] = [];
  const used: Policy[] = [];
  const ruleIds: string[] = [];
  const covering = policies.filter((p) => p.coveredMemberIds.includes(member.id));

  if (risk === 'health') {
    for (const p of covering.filter((p) => HEALTH_BASE.includes(p.kind))) {
      amounts[layerOf(p)] += Math.max(0, p.sumInsured - p.claimsUsedThisYear);
      used.push(p);
    }
    if (used.some((p) => p.source === 'employer')) ruleIds.push('R-HN-012');
    // R-HN-013: a super top-up counts only when the base covers its deductible.
    const base = amounts.employer + amounts.personal + amounts.statutory;
    for (const p of covering.filter((p) => p.kind === 'super_top_up')) {
      ruleIds.push('R-HN-013');
      if (base >= p.terms.deductible) {
        amounts[layerOf(p)] += p.sumInsured;
        used.push(p);
      } else issues.push('topup_without_base');
    }
  } else {
    const kinds = risk === 'life' ? LIFE_KINDS : ['personal_accident'];
    for (const p of covering.filter((p) => kinds.includes(p.kind))) {
      amounts[layerOf(p)] += p.sumInsured;
      used.push(p);
      if (p.kind === 'endowment') {
        issues.push('savings_plan_not_term');
        ruleIds.push('R-LF-002');
      }
    }
  }
  return { amounts, issues, used, ruleIds };
}

/** R-HN-012 / 05 §3.2: covered, contingent on a job, partial, gap. */
function statusOf(need: number, amounts: CoverCell['have'], issues: CellIssue[]): CellStatus {
  if (need === 0) return 'na';
  const own = (amounts.statutory + amounts.personal) / need;
  const all = (amounts.statutory + amounts.personal + amounts.employer) / need;
  const blocked = issues.includes('topup_without_base');
  if (own >= 0.9 && !blocked) return 'covered';
  if (all >= 0.9 && !blocked) return 'contingent';
  if (all >= 0.3) return 'partial';
  return 'gap';
}

/** R-SC-001: weighted share of need met, employer cover counted half. */
function score(cells: CoverCell[], household: Household): number {
  let total = 0;
  let met = 0;
  for (const cell of cells) {
    if (cell.status === 'na') continue;
    const member = household.members.find((m) => m.id === cell.memberId)!;
    const w = weight(member, cell.risk);
    const counted = cell.have.statutory + cell.have.personal + 0.5 * cell.have.employer;
    total += w;
    met += w * Math.min(1, counted / cell.need);
  }
  return total ? Math.round((100 * met) / total) : 0;
}

/** The household's cover as it stands on `asOf`: members × health, life, accident. */
export function coverMap(household: Household, asOf: string): CoverMap {
  const policies = household.policies.filter((p) => inForce(p, asOf));
  const cells = needs(household).map((need): CoverCell => {
    const member = household.members.find((m) => m.id === need.memberId)!;
    const { amounts, issues, used, ruleIds } = have(member, need.risk, policies);
    const status = statusOf(need.amount, amounts, issues);
    const employerPolicies = used.filter((p) => p.source === 'employer');
    const firstEnd = employerPolicies.map((p) => p.endDate).sort()[0];
    return {
      memberId: need.memberId,
      risk: need.risk,
      status,
      need: need.amount,
      have: amounts,
      gap:
        status === 'na'
          ? 0
          : Math.max(0, need.amount - amounts.statutory - amounts.employer - amounts.personal),
      issues: status === 'na' ? [] : issues,
      policyIds: used.map((p) => p.id),
      employer: employerPolicies[0]?.employer,
      employerCoverEnds: firstEnd,
      ruleIds: status === 'na' ? [] : [...need.ruleIds, ...ruleIds],
    };
  });
  return { asOf, cells, score: score(cells, household) };
}
