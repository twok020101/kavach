import { BillingType, type Locale, type LiveServerMessage } from '@kavach/schemas';
import type { DeskPort } from './port';

export type Emit = (message: LiveServerMessage) => void;
export type ToolResult = Record<string, unknown>;

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
