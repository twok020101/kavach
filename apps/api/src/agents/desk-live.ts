import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatInr } from '@kavach/engine';
import { LANGUAGE_NAMES } from '../core/locales';
import type { DeskContext, Locale } from '@kavach/schemas';
import { appRoot } from '../paths';

const template = readFileSync(resolve(appRoot, 'src/agents/prompts/desk-live.md'), 'utf8');

// Each session gets only its own language's style notes, so it has no other language to copy.
const LANGUAGE_STYLE: Record<Locale, string> = {
  en: '',
  hi: `Hindi style: natural spoken Hindi with common English insurance words kept in English ("room rent", "policy", "TPA",
"cashless"). Example: "Pehle parents wali policy ka card TPA desk par dijiye. Sign karne se pehle TPA desk se confirm
kar lijiye."`,
  ta: `Tamil style: plain spoken Tamil in Tamil script; keep "policy", "TPA", "claim" and amounts as given. Read amounts as
numbers.`,
  zh: `Mandarin style: everyday Singapore Mandarin in Simplified characters; keep plan names such as MediShield Life and
Integrated Shield Plan in English. Read amounts as numbers.`,
  ms: `Malay style: plain Bahasa Melayu; keep plan names in English. Read amounts as numbers.`,
};

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
    language: LANGUAGE_NAMES[language].english,
    language_style: LANGUAGE_STYLE[language],
    patient_name: patient.name,
    age: String(patient.age),
    relation: patient.relation,
    policies,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}

/** The six live tools, as Gemini function declarations (JSON Schema parameters). */
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
    name: 'record_spoken_estimate',
    description:
      'When the family tells you the room rents aloud (and maybe the quoted total and the days) because no printed estimate or photo is available yet, record them here so the rules engine can run. Call it as soon as the figures are spoken; never ask for figures you were already told. Do not call it once an estimate has been read unless new figures are spoken; a question that only names a room or ward class goes to evaluate_options.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        hospitalName: { type: 'string' },
        procedure: { type: 'string', description: 'What the admission is for, as said.' },
        admissionType: { type: 'string', enum: ['planned', 'emergency'] },
        days: { type: 'integer', description: 'Expected days of stay; 1 if not known.' },
        rooms: {
          type: 'array',
          description:
            "Every room category mentioned with its rent per day in the family's currency.",
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, rentPerDay: { type: 'number' } },
            required: ['label', 'rentPerDay'],
          },
        },
        quotedTotal: {
          type: 'number',
          description:
            "The total the hospital quoted, in the family's currency, for the quoted room and the days given, if any.",
        },
        otherCharges: {
          type: 'number',
          description:
            'Everything except room rent, in rupees, when known on its own (the last result returns it). Pass it unchanged when only the days change.',
        },
        treatment: {
          type: 'string',
          enum: ['general', 'maternity_normal', 'maternity_csection'],
          description:
            'maternity_normal or maternity_csection when the admission is a delivery, so the maternity limit applies; general otherwise.',
        },
        quotedRoom: {
          type: 'string',
          description: 'Which room the quoted total was for, if said.',
        },
        billingType: {
          type: 'string',
          enum: ['differential', 'flat', 'package', 'unknown'],
          description:
            'flat if the person said the other charges are the same in every room; differential if they change with the room; unknown if not said.',
        },
      },
      required: ['rooms'],
    },
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
        panelAnswer: {
          type: 'string',
          enum: ['panel', 'nonPanel'],
          description:
            "Singapore only: the desk's answer to whether the specialist is on the insurer's panel with pre-authorisation.",
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
