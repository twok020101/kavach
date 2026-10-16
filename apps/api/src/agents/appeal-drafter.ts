import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatInr, RULES } from '@kavach/engine';
import {
  AppealDraft,
  type ClaimAssessment,
  type Clause,
  type SettlementLetter,
} from '@kavach/schemas';
import { generateStructured, models } from '../lib/gemini';
import { appRoot } from '../paths';

const prompt = readFileSync(resolve(appRoot, 'src/agents/prompts/appeal-drafter.md'), 'utf8');

/**
 * AppealDrafter (docs/plan/03 §4.7): writes the appeal for the deductions the engine found
 * challengeable or possibly recoverable. Amounts are handed over pre-formatted from the engine.
 */
export async function draftAppeal(input: {
  letter: SettlementLetter;
  assessment: ClaimAssessment;
  clauses: Clause[];
}) {
  const { letter, assessment, clauses } = input;
  const items = assessment.deductions
    .filter((d) => d.verdict !== 'valid')
    .map((d) => {
      const clause = clauses.find((c) => c.id === d.citation?.clauseId);
      return {
        label: d.label,
        deducted: formatInr(d.amount),
        payableAfterCopay: formatInr(d.recoverable),
        verdict: d.verdict,
        reason: d.reason,
        ruleId: d.ruleId,
        rule: d.ruleId ? RULES[d.ruleId]?.statement : undefined,
        clause: clause && {
          id: clause.id,
          ref: clause.ref,
          title: clause.title,
          text: clause.text,
        },
      };
    });
  const facts = {
    insurer: letter.insurer,
    claimNumber: letter.claimNumber,
    patientName: letter.patientName,
    hospitalName: letter.hospitalName,
    admissionDate: letter.admissionDate,
    dischargeDate: letter.dischargeDate,
    letterDate: letter.letterDate,
    bill: formatInr(letter.billAmount),
    approved: formatInr(letter.approvedAmount),
    roomCategory: letter.roomCategory,
    deductions: items,
    totalRecoverable: formatInr(assessment.recoverable),
  };
  return generateStructured({
    model: models.pro,
    schema: AppealDraft,
    systemInstruction: prompt,
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(facts, null, 2) }] }],
    fixture: 'appeal-cx1',
  });
}
