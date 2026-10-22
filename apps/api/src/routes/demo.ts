import { DemoCheckpoint, DemoPersona, StartDemoResponse } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth';
import { createDemoHousehold } from '../demo';

/** Public demo entry: each visitor gets their own clone of a demo family (the Sharmas by default). */
export const demoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/v1/public/demo',
    {
      preHandler: requireUser,
      schema: {
        querystring: z.object({
          checkpoint: DemoCheckpoint.default('hospital'),
          persona: DemoPersona.default('sharma'),
        }),
        response: { 200: StartDemoResponse },
      },
    },
    async (request) => {
      const { checkpoint, persona } = request.query;
      const household = await createDemoHousehold(request.uid, checkpoint, persona);
      return { householdId: household.id };
    },
  );
};
