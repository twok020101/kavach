import type {
  BillingType,
  DeskAnswer,
  DeskContext,
  HospitalEstimate,
  Household,
  Locale,
} from '@kavach/schemas';
import { deskContext, deskPatient } from '../core/context';
import { getSession, takeTurn } from '../desk/sessions';
import { productKeyFor, searchClauses } from '../retrieval/clauses';
import { store } from '../store';

/**
 * Everything the live bridge needs from the desk core. The bridge only talks to this port, so
 * it can move to a separate (e.g. Python) service that implements it over the HTTP desk routes.
 */
export interface DeskPort {
  context(): Promise<DeskContext>;
  /** The latest estimate captured in this desk session. */
  estimate(): Promise<HospitalEstimate | undefined>;
  /** `answer()` for this session (the same call the text desk's turns route makes). */
  evaluate(input: {
    question?: string;
    billingTypeAnswer?: BillingType;
    language: Locale;
  }): Promise<DeskAnswer>;
  lastAnswer(): Promise<DeskAnswer | undefined>;
  searchClauses(
    query: string,
  ): Promise<{ productName: string; ref: string; title: string; text: string; page: number }[]>;
}

/** The port backed by the desk session store in this process. */
export function inProcessDesk(householdId: string, sessionId: string): DeskPort {
  const household = async () => {
    const h = await store.get<Household>('households', householdId);
    if (!h) throw Object.assign(new Error('Household not found'), { statusCode: 404 });
    return h;
  };
  const session = async () => getSession(await household(), sessionId);

  return {
    async context() {
      const h = await household();
      const s = await getSession(h, sessionId);
      return deskContext(h, deskPatient(h, s.patientMemberId));
    },
    estimate: async () => (await session()).estimate,
    evaluate: async ({ question, billingTypeAnswer, language }) =>
      takeTurn(await household(), sessionId, { text: question, billingTypeAnswer, language }),
    lastAnswer: async () => (await session()).lastAnswer,
    async searchClauses(query) {
      const h = await household();
      const s = await getSession(h, sessionId);
      const keys = new Set(
        deskPatient(h, s.patientMemberId)
          .policies.map((p) => productKeyFor(p))
          .filter(Boolean),
      );
      const hits = await searchClauses(query, undefined, 10);
      const own = hits.filter((hit) => keys.has(hit.clause.productKey));
      return (own.length ? own : hits).slice(0, 3).map(({ clause }) => ({
        productName: clause.productName,
        ref: clause.ref,
        title: clause.title,
        text: clause.text.slice(0, 600),
        page: clause.page,
      }));
    },
  };
}
