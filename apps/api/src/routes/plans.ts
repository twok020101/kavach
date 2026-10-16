import { plan } from '@kavach/engine';
import { Plan } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';

const Params = z.object({ hid: z.string() });

/** The household's plan, as of its today or any other date (the S09 date scrubber). */
export const planRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  app.get(
    '/v1/households/:hid/plans/current',
    {
      schema: {
        params: Params,
        querystring: z.object({ asOf: z.iso.date().optional() }),
        response: { 200: Plan },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      return plan(household, request.query.asOf);
    },
  );

  app.post(
    '/v1/households/:hid/plans::preview',
    {
      schema: {
        params: Params,
        body: z.object({ asOf: z.iso.date() }),
        response: { 200: Plan },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      return plan(household, request.body.asOf);
    },
  );
};
