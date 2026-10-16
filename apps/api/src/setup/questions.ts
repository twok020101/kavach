import { needs } from '@kavach/engine';
import type { ConsentPurpose, Household, SmartQuestion, SmartQuestionId } from '@kavach/schemas';

const MAX_QUESTIONS = 3;

/** Whether the family agreed to a purpose (S03). The demo family is made up, so it has them all. */
export const hasConsent = (household: Household, purpose: ConsentPurpose) =>
  household.isDemo ||
  (household.consents?.some((c) => c.purpose === purpose && !c.withdrawnAt) ?? false);

/** Total life-cover need, from the engine: the ₹ effect a question's answer can have. */
const lifeNeed = (household: Household) =>
  needs(household)
    .filter((n) => n.risk === 'life')
    .reduce((sum, n) => sum + n.amount, 0);

/** S08: up to three questions whose answers change the plan, in order of how much they matter. */
export function smartQuestions(household: Household): SmartQuestion[] {
  const answered = (id: SmartQuestionId) => household.answers?.[id] !== undefined;
  const questions: SmartQuestion[] = [];

  const spouse = household.members.find((m) => m.relation === 'spouse');
  if (spouse && spouse.earning === undefined && !answered('spouse_earning')) {
    const delta = Math.abs(
      lifeNeed(withMember(household, spouse.id, { earning: true })) -
        lifeNeed(withMember(household, spouse.id, { earning: false })),
    );
    questions.push({
      id: 'spouse_earning',
      params: { name: spouse.name },
      options: ['no', 'part_time', 'yes'],
      ...(delta > 0 && { impact: delta }),
    });
  }

  if (!answered('other_cover')) {
    const employer = household.policies.find((p) => p.source === 'employer')?.employer;
    questions.push({
      id: 'other_cover',
      params: employer ? { employer } : {},
      options: ['only', 'another'],
    });
  }

  const parent = household.members
    .filter((m) => m.relation === 'parent' || m.relation === 'parent_in_law')
    .sort((a, b) => b.age - a.age)[0];
  if (
    parent &&
    hasConsent(household, 'health') &&
    parent.conditions.length === 0 &&
    !answered('parents_health')
  ) {
    questions.push({
      id: 'parents_health',
      params: { name: parent.name, memberId: parent.id },
      options: ['none', 'diabetes_t2', 'hypertension', 'heart_disease'],
    });
  }
  return questions.slice(0, MAX_QUESTIONS);
}

/** Applies the answers to the household's members; every answer is also kept as given. */
export function applyAnswers(
  household: Household,
  answers: Partial<Record<SmartQuestionId, string>>,
): Pick<Household, 'members' | 'answers'> {
  let next = household;
  const spouse = household.members.find((m) => m.relation === 'spouse');
  if (spouse && answers.spouse_earning) {
    next = withMember(next, spouse.id, { earning: answers.spouse_earning !== 'no' });
  }
  const parentId = smartQuestions(household).find((q) => q.id === 'parents_health')?.params
    .memberId;
  if (parentId && answers.parents_health && answers.parents_health !== 'none') {
    next = withMember(next, parentId, { conditions: [answers.parents_health] });
  }
  return { members: next.members, answers: { ...household.answers, ...answers } };
}

function withMember(
  household: Household,
  id: string,
  patch: Partial<Household['members'][number]>,
): Household {
  return {
    ...household,
    members: household.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  };
}
