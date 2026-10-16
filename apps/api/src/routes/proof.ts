import { RULES } from '@kavach/engine';
import { EvalResults, ProofResponse } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
// Bundled at build time, so the deployed API serves the results committed with it.
import latest from '../../../../evals/results/latest.json' with { type: 'json' };

const results = EvalResults.parse(latest);
const rules = Object.values(RULES).map(({ id, name, status, sources }) => ({
  id,
  name,
  status,
  sources,
}));

/** S26 Proof page data: the latest policy-reading eval and the rules with their check status. */
export const proofRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/v1/public/proof', { schema: { response: { 200: ProofResponse } } }, async () => ({
    results,
    rules,
  }));
};
