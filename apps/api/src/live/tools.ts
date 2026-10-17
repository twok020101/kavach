import {
  BillingType,
  HospitalEstimate,
  type Locale,
  type LiveServerMessage,
} from '@kavach/schemas';
import { z } from 'zod';
import type { DeskPort } from './port';

export type Emit = (message: LiveServerMessage) => void;
export type ToolResult = Record<string, unknown>;

/** What the family can tell the desk aloud when no photo is possible yet. */
const SpokenEstimate = z.object({
  hospitalName: z.string().trim().min(1).optional(),
  procedure: z.string().trim().min(1).optional(),
  admissionType: z.enum(['planned', 'emergency']).optional(),
  days: z.number().int().positive().default(1),
  rooms: z
    .array(z.object({ label: z.string().trim().min(1), rentPerDay: z.number().nonnegative() }))
    .min(1),
  quotedTotal: z.number().nonnegative().optional(),
  quotedRoom: z.string().trim().optional(),
  billingType: BillingType.optional(),
});

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/**
 * Builds a HospitalEstimate from what was said: one room line priced per room (rent x days) and,
 * when a total was quoted, one "other charges" line that is the same in every room. The billing
 * type stays unknown unless stated, so the engine computes both branches and asks the one question.
 */
function estimateFromSpeech(input: z.infer<typeof SpokenEstimate>): HospitalEstimate {
  const quoted = input.quotedRoom?.toLowerCase();
  const quotedIndex = quoted
    ? Math.max(
        0,
        input.rooms.findIndex((r) => r.label.toLowerCase() === quoted),
      )
    : 0;
  const ordered = [input.rooms[quotedIndex]!, ...input.rooms.filter((_, i) => i !== quotedIndex)];
  const rooms = ordered.map((r) => ({
    id: slug(r.label),
    label: r.label,
    rentPerDay: Math.round(r.rentPerDay),
  }));
  const roomAmounts = Object.fromEntries(rooms.map((r) => [r.id, r.rentPerDay * input.days]));
  const lines: HospitalEstimate['lines'] = [
    {
      head: 'room',
      label: `Room charges x ${input.days} days`,
      pricedByRoom: true,
      amounts: roomAmounts,
    },
  ];
  if (input.quotedTotal !== undefined) {
    const other = Math.max(0, Math.round(input.quotedTotal) - rooms[0]!.rentPerDay * input.days);
    lines.push({
      head: 'other',
      label: 'Other hospital charges (as told at the desk)',
      pricedByRoom: false,
      amounts: Object.fromEntries(rooms.map((r) => [r.id, other])),
    });
  }
  return HospitalEstimate.parse({
    hospitalName: input.hospitalName ?? 'Hospital (as told at the desk)',
    procedure: input.procedure ?? 'Treatment (as told at the desk)',
    admissionType: input.admissionType ?? 'planned',
    days: input.days,
    billingType: input.billingType ?? 'unknown',
    roomCategories: rooms,
    lines,
    needsConfirmation: false,
    notes: ['Told at the desk, not read from a photo. Ask for the printed estimate when it comes.'],
  });
}

/** Step ids the browser shows in the agent-steps ticker (translated there). */
type Step = 'reading' | 'policies' | 'rooms' | 'verify';

/**
 * Runs the live agent's five tools against the desk port. Results go back to the model;
 * estimates, answers and cards also go to the browser through `emit`. Every amount comes from
 * `answer()`, and emit_card can only show cards that answer() built.
 */
export function deskTools(port: DeskPort, emit: Emit, language: () => Locale) {
  async function step<T>(label: Step, work: () => Promise<T>): Promise<T> {
    emit({ type: 'step', label, state: 'start' });
    try {
      return await work();
    } finally {
      emit({ type: 'step', label, state: 'done' });
    }
  }

  const tools: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
    async get_patient_context() {
      const [context, estimate] = await Promise.all([port.context(), port.estimate()]);
      return { ...context, estimateCaptured: Boolean(estimate) };
    },

    async read_estimate() {
      const estimate = await step('reading', () => port.estimate());
      if (!estimate) return { status: 'needs_capture' };
      emit({ type: 'estimate', estimate });
      const { hospitalName, procedure, days, billingType, roomCategories } = estimate;
      return {
        status: estimate.needsConfirmation ? 'needs_confirmation' : 'ok',
        hospitalName,
        procedure,
        days,
        billingType,
        roomCategories,
        notes: estimate.notes,
      };
    },

    async record_spoken_estimate(args) {
      const parsed = SpokenEstimate.safeParse(args);
      if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join('; ') };
      const { estimate } = await step('reading', () =>
        port.spokenEstimate(estimateFromSpeech(parsed.data)),
      );
      emit({ type: 'estimate', estimate });
      return {
        status: 'ok',
        days: estimate.days,
        billingType: estimate.billingType,
        roomCategories: estimate.roomCategories,
        instruction:
          'Recorded. Now call evaluate_options. Do not ask for these figures again; ask for a photo of the printed estimate at most once, later.',
      };
    },

    async evaluate_options(args) {
      const billing = BillingType.safeParse(args.billingTypeAnswer);
      const reply = await step('policies', () =>
        port.evaluate({
          question: typeof args.question === 'string' ? args.question : undefined,
          billingTypeAnswer: billing.success ? billing.data : undefined,
          language: language(),
        }),
      );
      await step('rooms', async () => emit({ type: 'answer', answer: reply }));
      return {
        say: reply.say,
        text: reply.text,
        questionForDesk: reply.questionForDesk,
        cards: reply.cards.map(({ id, kind, title }) => ({ id, kind, title })),
        instruction: reply.questionForDesk
          ? 'Ask the questionForDesk first, before any amount.'
          : 'Speak `say` exactly as given, and emit_card each card as you speak about it.',
      };
    },

    async search_clauses(args) {
      const query = typeof args.query === 'string' ? args.query : '';
      if (!query) return { error: 'query is required' };
      return { clauses: await port.searchClauses(query) };
    },

    async emit_card(args) {
      const card = (await port.lastAnswer())?.cards.find((c) => c.id === args.cardId);
      if (!card) return { error: 'Unknown card id. Call evaluate_options first.' };
      emit({ type: 'card', card });
      return { shown: card.id };
    },
  };

  return async function runTool(name: string, args: Record<string, unknown> = {}) {
    const tool = tools[name];
    if (!tool) return { error: `Unknown tool ${name}` };
    try {
      return await tool(args);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Tool failed' };
    }
  };
}

export type RunTool = ReturnType<typeof deskTools>;
