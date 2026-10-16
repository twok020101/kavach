import { householdToday } from '@kavach/engine';
import { Action } from '@kavach/schemas';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import { blobs } from '../lib/blobs';
import { renderLetterPdf } from '../letters/pdf';
import { store } from '../store';

const Params = z.object({ hid: z.string() });
const ActionParams = Params.extend({ aid: z.string() });
const LETTER_KINDS: readonly Action['kind'][] = ['migration_letter', 'grievance_letter'];

const collection = (hid: string) => `households/${hid}/actions`;
const pdfUrl = (a: Action) => `/v1/households/${a.householdId}/actions/${a.id}/pdf`;

async function loadAction(request: FastifyRequest, hid: string, aid: string) {
  const household = await loadHousehold(request, hid);
  const action = await store.get<Action>(collection(household.id), aid);
  if (!action) throw Object.assign(new Error('Action not found'), { statusCode: 404 });
  return { household, action };
}

/** Actions Kavach drafted for the family: they review, approve (letters become PDFs) or dismiss. */
export const actionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser);

  app.get(
    '/v1/households/:hid/actions',
    {
      schema: {
        params: Params,
        querystring: z.object({ status: Action.shape.status.optional() }),
        response: { 200: z.array(Action) },
      },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      const actions = await store.list<Action>(collection(household.id));
      return actions
        .filter((a) => !request.query.status || a.status === request.query.status)
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
    },
  );

  app.get(
    '/v1/households/:hid/actions/:aid',
    { schema: { params: ActionParams, response: { 200: Action } } },
    async (request) => (await loadAction(request, request.params.hid, request.params.aid)).action,
  );

  app.patch(
    '/v1/households/:hid/actions/:aid',
    {
      schema: {
        params: ActionParams,
        body: z.object({ content: z.string().min(1).max(20_000) }),
        response: { 200: Action },
      },
    },
    async (request) => {
      const { action } = await loadAction(request, request.params.hid, request.params.aid);
      if (action.status !== 'draft')
        throw Object.assign(new Error('Only drafts can be edited'), { statusCode: 409 });
      const updated = { ...action, content: request.body.content };
      await store.set(collection(action.householdId), action.id, updated);
      return updated;
    },
  );

  // `:approve` and `:dismiss` after a path parameter: Fastify can't route two literal suffixes on one
  // parameter, so the parameter carries "<aid>:<verb>" and is split here.
  app.post(
    '/v1/households/:hid/actions/:command',
    {
      schema: {
        params: Params.extend({ command: z.string().regex(/^[\w-]+:(approve|dismiss)$/) }),
        body: z.object({ reason: z.string().max(500).optional() }).nullish(),
        response: { 200: z.object({ action: Action, pdfUrl: z.string().optional() }) },
      },
    },
    async (request) => {
      const [aid = '', verb] = request.params.command.split(':');
      const { household, action } = await loadAction(request, request.params.hid, aid);
      if (verb === 'dismiss') {
        const dismissed: Action = { ...action, status: 'dismissed' };
        await store.set(collection(household.id), action.id, dismissed);
        return { action: dismissed };
      }
      const approved: Action = { ...action, status: 'approved' };
      if (LETTER_KINDS.includes(action.kind)) {
        const approvedOn = new Date(`${householdToday(household)}T00:00:00Z`).toLocaleDateString(
          'en-IN',
          { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
        );
        const path = `households/${household.id}/actions/${action.id}.pdf`;
        await blobs.put(path, await renderLetterPdf(action, approvedOn), 'application/pdf');
        approved.pdfPath = path;
      }
      await store.set(collection(household.id), action.id, approved);
      return { action: approved, pdfUrl: approved.pdfPath ? pdfUrl(approved) : undefined };
    },
  );

  app.get(
    '/v1/households/:hid/actions/:aid/pdf',
    { schema: { params: ActionParams } },
    async (request, reply) => {
      const { action } = await loadAction(request, request.params.hid, request.params.aid);
      if (!action.pdfPath)
        throw Object.assign(new Error('Approve the letter first'), { statusCode: 404 });
      return reply
        .type('application/pdf')
        .header('content-disposition', `inline; filename="kavach-${action.kind}.pdf"`)
        .send(await blobs.get(action.pdfPath));
    },
  );
};
