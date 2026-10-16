import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatInr } from '@kavach/engine';
import type { DeskContext, Locale } from '@kavach/schemas';
import { appRoot } from '../paths';

const template = readFileSync(resolve(appRoot, 'src/agents/prompts/desk-live.md'), 'utf8');

/** The DeskAgent system instruction (docs/plan/03-gemini-and-agents.md §4.6) for one patient. */
export function deskLiveInstruction(context: DeskContext, language: Locale): string {
  const { patient } = context;
  const policies =
    context.policies
      .map(
        (p) =>
          `${p.nickname} (${p.name}, sum insured ${formatInr(p.sumInsured)}${
            p.roomRentLimitPerDay ? `, room rent limit ${formatInr(p.roomRentLimitPerDay)}/day` : ''
          })`,
      )
      .join('; ') || 'none';
  const values: Record<string, string> = {
    language: language === 'hi' ? 'Hindi' : 'English',
    patient_name: patient.name,
    age: String(patient.age),
    relation: patient.relation,
    policies,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}

/** The five live tools, as Gemini function declarations (JSON Schema parameters). */
export const deskLiveTools = [
  {
    name: 'get_patient_context',
    description:
      "The patient, the family's health policies in force today and whether an estimate has been captured.",
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_estimate',
    description:
      'The latest hospital estimate captured in this session, or status needs_capture when there is none yet.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'evaluate_options',
    description:
      'Runs the rules engine on the captured estimate: which policy card to give first, out-of-pocket per room, the saving, and the exact `say` line to speak. Returns card ids for emit_card and any questionForDesk to ask first.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: "The user's question, as they said it." },
        billingTypeAnswer: {
          type: 'string',
          enum: ['differential', 'flat', 'package'],
          description:
            "The desk's answer to the billing question: charges differ by room (differential), same in every room (flat), or one package price (package).",
        },
      },
    },
  },
  {
    name: 'search_clauses',
    description:
      "Searches the wording of the family's policies for clauses about a topic (room rent, co-pay, ICU, proportionate deduction).",
    parametersJsonSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'emit_card',
    description: 'Shows one answer card from the last evaluate_options result on the screen.',
    parametersJsonSchema: {
      type: 'object',
      properties: { cardId: { type: 'string' } },
      required: ['cardId'],
    },
  },
];
