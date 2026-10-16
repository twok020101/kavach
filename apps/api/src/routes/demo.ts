import { DemoCheckpoint, StartDemoResponse } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth';
import { createDemoHousehold } from '../demo';

/** Public demo entry: each visitor gets their own clone of the Sharma household. */
export const demoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/v1/public/demo',
    {
      preHandler: requireUser,
      schema: {
        querystring: z.object({ checkpoint: DemoCheckpoint.default('hospital') }),
        response: { 200: StartDemoResponse },
      },
    },
    async (request) => {
      const household = await createDemoHousehold(request.uid, request.query.checkpoint);
      return { householdId: household.id };
    },
  );
};
