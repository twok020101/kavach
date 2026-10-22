import type { HospitalContext } from '@kavach/engine';
import type { DeskContext, Household, Locale, Member, Policy } from '@kavach/schemas';

const HEALTH_KINDS: readonly Policy['kind'][] = [
  'group_health',
  'retail_health',
  'super_top_up',
  'medishield_life',
  'integrated_shield',
];

/** How a policy is named: on screen in the screen's language, or spoken (Hindi in Latin script for the voice). */
export type NameStyle = Locale | 'hiSpeech';

export type DeskPatient = {
  member: Member;
  /** Health policies in force for the patient on `asOf`, in household order. */
  policies: Policy[];
  asOf: string;
  engine: HospitalContext;
};

/** The context pack for one patient: who they are and which health policies cover them today. */
export function deskPatient(household: Household, patientId: string): DeskPatient {
  const member = household.members.find((m) => m.id === patientId);
  if (!member)
    throw Object.assign(new Error('Patient is not in this household'), { statusCode: 404 });

  const asOf = household.asOf ?? new Date().toISOString().slice(0, 10);
  // Same filter the engine applies, so "no cover" is known before calling it.
  const policies = household.policies.filter(
    (p) =>
      HEALTH_KINDS.includes(p.kind) &&
      p.coveredMemberIds.includes(member.id) &&
      p.startDate <= asOf &&
      p.endDate >= asOf,
  );
  return {
    member,
    policies,
    asOf,
    engine: { patient: { age: member.age, memberId: member.id }, policies, asOf },
  };
}

/** The real name printed on the policy. */
export const policyName = (p: Policy) => `${p.productName} · ${p.insurer}`;

/** What the family calls a policy: "parents' policy", "company policy", "top-up policy". */
export function policyNickname(policy: Policy, household: Household, style: NameStyle): string {
  const covered = household.members.filter((m) => policy.coveredMemberIds.includes(m.id));
  const forParents =
    covered.length > 0 && covered.every((m) => ['parent', 'parent_in_law'].includes(m.relation));
  const kind =
    policy.kind === 'super_top_up'
      ? 'topUp'
      : policy.kind === 'medishield_life'
        ? 'medishield'
        : policy.kind === 'integrated_shield'
          ? 'shield'
          : forParents
            ? 'parents'
            : policy.source === 'employer'
              ? 'company'
              : undefined;
  if (!kind) return policy.productName;
  return NICKNAMES[style][kind];
}

const NICKNAMES = {
  en: {
    parents: "parents' policy",
    company: 'company policy',
    topUp: 'top-up policy',
    medishield: 'MediShield Life',
    shield: 'Shield plan',
  },
  hi: {
    parents: 'पेरेंट्स वाली पॉलिसी',
    company: 'कंपनी वाली पॉलिसी',
    topUp: 'टॉप-अप पॉलिसी',
    medishield: 'MediShield Life',
    shield: 'Shield प्लान',
  },
  hiSpeech: {
    parents: 'parents wali policy',
    company: 'company wali policy',
    topUp: 'top-up policy',
    medishield: 'MediShield Life',
    shield: 'Shield plan',
  },
  ta: {
    parents: 'பெற்றோர் பாலிசி',
    company: 'கம்பெனி பாலிசி',
    topUp: 'டாப்-அப் பாலிசி',
    medishield: 'MediShield Life',
    shield: 'Shield பிளான்',
  },
  zh: {
    parents: '父母的保单',
    company: '公司保单',
    topUp: '附加保单',
    medishield: 'MediShield Life（终身健保）',
    shield: 'Shield 综合健保计划',
  },
  ms: {
    parents: 'polisi ibu bapa',
    company: 'polisi syarikat',
    topUp: 'polisi tambahan',
    medishield: 'MediShield Life',
    shield: 'pelan Shield',
  },
} as const;

/** The context summary shown when a desk session starts. */
export function deskContext(household: Household, patient: DeskPatient): DeskContext {
  const { member } = patient;
  return {
    patient: { id: member.id, name: member.name, age: member.age, relation: member.relation },
    asOf: patient.asOf,
    policies: patient.policies.map((p) => ({
      id: p.id,
      name: policyName(p),
      nickname: policyNickname(p, household, 'en'),
      kind: p.kind,
      sumInsured: p.sumInsured,
      claimsUsedThisYear: p.claimsUsedThisYear,
      roomRentLimitPerDay: p.terms.roomRentLimitPerDay,
      copayPercent: p.terms.copayPercent,
      copayFromAge: p.terms.copayFromAge,
      deductible: p.terms.deductible,
    })),
  };
}
