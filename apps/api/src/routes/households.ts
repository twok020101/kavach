import { DemoCheckpoint, Household } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import { resetDemoHousehold } from '../demo';
import { store } from '../store';

const Params = z.object({ hid: z.string() });

export const householdRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  app.get(
    '/v1/households/:hid',
    { schema: { params: Params, response: { 200: Household } } },
    async (request) => loadHousehold(request, request.params.hid),
  );

  // Demo controls (S29). `::` is Fastify's escape for a literal ':' in a path.
  app.post(
    '/v1/households/:hid/demo::reset',
    {
      schema: {
        params: Params,
        body: z.object({
          persona: z.literal('sharma').default('sharma'),
          checkpoint: DemoCheckpoint,
        }),
        response: { 200: Household },
      },
    },
    async (request) => {
      const household = await loadDemoHousehold(request, request.params.hid);
      return resetDemoHousehold(household, request.body.checkpoint);
    },
  );

  app.post(
    '/v1/households/:hid/demo::clock',
    {
      schema: {
        params: Params,
        body: z.object({ date: z.iso.date() }),
        response: { 200: Household },
      },
    },
    async (request) => {
      const household = await loadDemoHousehold(request, request.params.hid);
      await store.update('households', household.id, { asOf: request.body.date });
      return { ...household, asOf: request.body.date };
    },
  );
};

async function loadDemoHousehold(...args: Parameters<typeof loadHousehold>) {
  const household = await loadHousehold(...args);
  if (!household.isDemo) {
    throw Object.assign(new Error('Only demo households have demo controls'), { statusCode: 403 });
  }
  return household;
}
