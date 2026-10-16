import { randomUUID } from 'node:crypto';
import {
  AnswersBody,
  CONSENT_VERSION,
  type ConsentPurpose,
  type ConsentRecord,
  CreateHouseholdBody,
  Household,
  IntakeParseBody,
  IntakeResult,
  SetConsentsBody,
  SetFinancesBody,
  SetMembersBody,
  SmartQuestion,
  Timeline,
} from '@kavach/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { parseFamily } from '../agents/intake';
import { loadHousehold, requireUser } from '../auth';
import { applyAnswers, hasConsent, smartQuestions } from '../setup/questions';
import { addTimeline, buildTimeline } from '../setup/timeline';
import { store } from '../store';

const Params = z.object({ hid: z.string() });

/** Everything a household keeps besides its own document. */
const SUBCOLLECTIONS = [
  'timeline',
  'documents',
  'lifeChanges',
  'actions',
  'deskSessions',
  'claimCases',
];

/** Onboarding (S03–S08), settings (S27) and the timeline (S25). */
export const setupRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  // S03: consent comes first, so the household is created with it.
  app.post(
    '/v1/households',
    { schema: { body: CreateHouseholdBody, response: { 201: Household } } },
    async (request, reply) => {
      const now = new Date().toISOString();
      const household: Household = {
        id: `hh_${randomUUID()}`,
        name: request.body.name ?? 'My family',
        city: '',
        country: 'IN',
        members: [],
        policies: [],
        assets: [],
        accessUids: [request.uid],
        access: [{ uid: request.uid, role: 'owner', addedAt: now }],
        consents: grant([], request.body.consents, now),
        isDemo: false,
        createdAt: now,
      };
      await store.set('households', household.id, household);
      await addTimeline(household.id, {
        kind: 'consent',
        by: 'you',
        params: { purposes: request.body.consents.join(',') },
      });
      return reply.code(201).send(household);
    },
  );

  // S04: the family's sentence (typed or spoken) → people to confirm.
  app.post(
    '/v1/households/:hid/intake::parse',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      bodyLimit: 2 * 1024 * 1024,
      schema: { params: Params, body: IntakeParseBody, response: { 200: IntakeResult } },
    },
    async (request) => {
      await loadHousehold(request, request.params.hid);
      return parseFamily(request.body);
    },
  );

  // S05: the family as confirmed.
  app.put(
    '/v1/households/:hid/members',
    { schema: { params: Params, body: SetMembersBody, response: { 200: Household } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const health = hasConsent(household, 'health');
      const members = request.body.members.map((m) => ({
        ...m,
        id: m.id ?? `mem_${slug(m.name)}_${randomUUID().slice(0, 4)}`,
        // Health details are kept only with the health consent (S03).
        conditions: health ? m.conditions : [],
      }));
      const first = household.members.length === 0;
      const patch = {
        name: request.body.name,
        city: request.body.city ?? household.city,
        members,
      };
      await store.update('households', household.id, patch);
      if (first) {
        await addTimeline(household.id, {
          kind: 'setup',
          by: 'you',
          params: { count: String(members.length) },
        });
      }
      return { ...household, ...patch };
    },
  );

  // S06: the four money facts.
  app.put(
    '/v1/households/:hid/finances',
    { schema: { params: Params, body: SetFinancesBody, response: { 200: Household } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      await store.update('households', household.id, { finances: request.body });
      return { ...household, finances: request.body };
    },
  );

  // S08: questions whose answers change the plan.
  app.get(
    '/v1/households/:hid/questions',
    { schema: { params: Params, response: { 200: z.array(SmartQuestion) } } },
    async (request) => smartQuestions(await loadHousehold(request, request.params.hid)),
  );

  app.post(
    '/v1/households/:hid/answers',
    { schema: { params: Params, body: AnswersBody, response: { 200: Household } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const patch = applyAnswers(household, request.body.answers);
      await store.update('households', household.id, patch);
      return { ...household, ...patch };
    },
  );

  // S27: consent per purpose; withdrawing keeps the record with a date.
  app.put(
    '/v1/households/:hid/consents',
    { schema: { params: Params, body: SetConsentsBody, response: { 200: Household } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const consents = grant(
        household.consents ?? [],
        request.body.consents,
        new Date().toISOString(),
      );
      const patch: Partial<Household> = { consents };
      // Without the health consent, health details are not kept.
      if (!request.body.consents.includes('health')) {
        patch.members = household.members.map((m) => ({ ...m, conditions: [] }));
      }
      await store.update('households', household.id, patch);
      await addTimeline(household.id, {
        kind: 'consent',
        by: 'you',
        params: { purposes: request.body.consents.join(',') },
      });
      return { ...household, ...patch };
    },
  );

  app.get(
    '/v1/households/:hid/timeline',
    { schema: { params: Params, response: { 200: Timeline } } },
    async (request) => buildTimeline(await loadHousehold(request, request.params.hid)),
  );

  // S27: download my data (JSON: the household and everything under it).
  app.get('/v1/households/:hid/export', { schema: { params: Params } }, async (request, reply) => {
    const household = await loadHousehold(request, request.params.hid);
    const collections = Object.fromEntries(
      await Promise.all(
        SUBCOLLECTIONS.map(
          async (name) => [name, await store.list(`households/${household.id}/${name}`)] as const,
        ),
      ),
    );
    return reply
      .header('content-disposition', `attachment; filename="kavach-${household.id}.json"`)
      .send({ exportedAt: new Date().toISOString(), household, ...collections });
  });

  // S27: delete the household and everything under it. Owner only.
  app.delete(
    '/v1/households/:hid',
    { schema: { params: Params, response: { 200: z.object({ deleted: z.literal(true) }) } } },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      requireOwner(household, request.uid);
      await Promise.all(
        SUBCOLLECTIONS.map(async (name) => {
          const collection = `households/${household.id}/${name}`;
          const docs = await store.list<{ id: string }>(collection);
          await Promise.all(docs.map((d) => store.delete(collection, d.id)));
        }),
      );
      const invites = await store.list<{ id: string; householdId: string }>('invites');
      await Promise.all(
        invites
          .filter((i) => i.householdId === household.id)
          .map((i) => store.delete('invites', i.id)),
      );
      await store.delete('households', household.id);
      request.log.info({ householdId: household.id }, 'household deleted');
      return { deleted: true as const };
    },
  );
};

/** Grants the listed purposes and withdraws the rest, keeping history. */
function grant(current: ConsentRecord[], purposes: ConsentPurpose[], now: string) {
  const active = (p: ConsentPurpose) => current.find((c) => c.purpose === p && !c.withdrawnAt);
  const kept = current.map((c) =>
    !c.withdrawnAt && !purposes.includes(c.purpose) ? { ...c, withdrawnAt: now } : c,
  );
  const added = purposes
    .filter((p) => !active(p))
    .map((purpose) => ({ purpose, version: CONSENT_VERSION, grantedAt: now }));
  return [...kept, ...added];
}

/** Only an owner may delete or manage access. Households without `access` predate roles. */
export function requireOwner(household: Household, uid: string) {
  const entry = household.access?.find((a) => a.uid === uid);
  if (household.access && entry?.role !== 'owner') {
    throw Object.assign(new Error('Only the owner can do this'), { statusCode: 403 });
  }
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12) || 'person';
