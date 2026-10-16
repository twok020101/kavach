import { randomUUID } from 'node:crypto';
import { applyChangeSet, diff, householdToday, plan } from '@kavach/engine';
import { Action, ChangeSet, LifeChangeRecord, Locale } from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { parseLifeChange } from '../agents/life-event';
import { loadHousehold, requireUser } from '../auth';
import { draftJobChangeActions } from '../letters/job-change';
import { store } from '../store';

const Params = z.object({ hid: z.string() });

/** Moment 1: the family says what is changing, confirms it, and Kavach re-plans and drafts actions. */
export const lifeChangeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  app.post(
    '/v1/households/:hid/life-changes::parse',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        params: Params,
        body: z.object({ text: z.string().min(3).max(1000), locale: Locale.default('en') }),
        response: { 200: ChangeSet },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      return parseLifeChange(household, householdToday(household), request.body.text);
    },
  );

  app.post(
    '/v1/households/:hid/life-changes',
    {
      schema: {
        params: Params,
        body: z.object({ changeSet: ChangeSet, text: z.string().max(1000).optional() }),
        response: {
          200: z.object({ id: z.string(), diff: LifeChangeRecord.shape.diff, actions: z.array(Action) }),
        },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const { changeSet, text } = request.body;
      const changed = applyChangeSet(household, changeSet);

      // Before: today, as things stood. After: the day the change takes effect.
      const before = plan(household);
      const after = plan(changed, changeSet.effectiveDate);
      const id = `lc_${randomUUID()}`;
      const actions = draftJobChangeActions(household, changeSet, id);
      const record: LifeChangeRecord = {
        id,
        householdId: household.id,
        text,
        changeSet,
        diff: diff(before, after),
        before,
        after,
        actionIds: actions.map((a) => a.id),
        createdAt: new Date().toISOString(),
      };

      await store.update('households', household.id, { policies: changed.policies });
      await Promise.all(
        actions.map((a) => store.set(`households/${household.id}/actions`, a.id, a)),
      );
      await store.set(`households/${household.id}/lifeChanges`, id, record);
      return { id, diff: record.diff, actions };
    },
  );

  app.get(
    '/v1/households/:hid/life-changes/:id',
    {
      schema: {
        params: Params.extend({ id: z.string() }),
        response: { 200: LifeChangeRecord },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const record = await store.get<LifeChangeRecord>(
        `households/${household.id}/lifeChanges`,
        request.params.id,
      );
      if (!record) throw Object.assign(new Error('Life change not found'), { statusCode: 404 });
      return record;
    },
  );
};
