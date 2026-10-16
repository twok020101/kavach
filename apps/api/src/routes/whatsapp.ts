import { householdToday } from '@kavach/engine';
import { CardShare, Household, Notification, WhatsAppOutboxMessage } from '@kavach/schemas';
import type { FastifyBaseLogger, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadHousehold, requireUser } from '../auth';
import { renderCardPng } from '../channels/whatsapp/card-image';
import { getShare } from '../channels/whatsapp/cards';
import { parseMetaWebhook, verifyMetaSignature } from '../channels/whatsapp/meta';
import { listNotifications } from '../channels/whatsapp/notify';
import { sendDueNudges } from '../channels/whatsapp/nudges';
import { listOutbox, mediaBlobPath } from '../channels/whatsapp/outbox';
import { parseTwilioForm, verifyTwilioSignature } from '../channels/whatsapp/twilio';
import type { Inbound, MediaRef } from '../channels/whatsapp/types';
import { handleInbound } from '../channels/whatsapp/webhook';
import { env } from '../env';
import { blobs } from '../lib/blobs';
import { store } from '../store';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

/** The dev simulator and outbox exist only off production, or with auth disabled. */
const devEnabled = env.NODE_ENV !== 'production' || env.AUTH_DISABLED;

/** Processes messages after the provider has had its 200, so it never retries on a slow answer. */
function inBackground(log: FastifyBaseLogger, messages: Inbound[]) {
  for (const msg of messages) {
    handleInbound(msg).catch((error: unknown) =>
      log.error({ err: error }, 'WhatsApp message failed'),
    );
  }
}

/** WhatsApp door (docs/plan/06-api.md "WhatsApp"): Meta and Twilio webhooks, card and media links. */
export const whatsappRoutes: FastifyPluginAsyncZod = async (app) => {
  // Meta's signature covers the raw body, so keep it; Twilio posts a form.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request, body, done) => {
    request.rawBody = body as Buffer;
    try {
      done(null, body.length ? JSON.parse(body.toString('utf8')) : {});
    } catch (error) {
      done(Object.assign(error as Error, { statusCode: 400 }));
    }
  });
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => done(null, Object.fromEntries(new URLSearchParams(body as string))),
  );

  app.get(
    '/v1/whatsapp/meta',
    {
      schema: {
        querystring: z.object({
          'hub.mode': z.string().optional(),
          'hub.verify_token': z.string().optional(),
          'hub.challenge': z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const q = request.query;
      const ok =
        env.META_WEBHOOK_VERIFY_TOKEN &&
        q['hub.mode'] === 'subscribe' &&
        q['hub.verify_token'] === env.META_WEBHOOK_VERIFY_TOKEN;
      if (!ok) return reply.code(403).send({ error: 'verify_token_mismatch' });
      return reply.type('text/plain').send(q['hub.challenge'] ?? '');
    },
  );

  app.post('/v1/whatsapp/meta', async (request, reply) => {
    if (
      !verifyMetaSignature(
        request.rawBody ?? Buffer.alloc(0),
        header(request, 'x-hub-signature-256'),
      )
    ) {
      return reply.code(401).send({ error: 'bad_signature' });
    }
    inBackground(request.log, parseMetaWebhook(request.body));
    return reply.send({ ok: true });
  });

  app.post('/v1/whatsapp/twilio', async (request, reply) => {
    const form = request.body as Record<string, string>;
    const url = `${env.PUBLIC_API_URL}${request.url}`;
    if (!verifyTwilioSignature(url, form, header(request, 'x-twilio-signature'))) {
      return reply.code(401).send({ error: 'bad_signature' });
    }
    inBackground(request.log, [parseTwilioForm(form)]);
    return reply.type('text/xml').send('<Response></Response>');
  });

  // Voice notes and letters Kavach sends, fetched by Meta and Twilio from this public URL.
  app.get(
    '/v1/public/whatsapp/media/:file',
    { schema: { params: z.object({ file: z.string().regex(/^wam_[\w-]+\.(ogg|pdf)$/) }) } },
    async (request, reply) => {
      const { file } = request.params;
      const data = await blobs.get(mediaBlobPath(file)).catch(() => undefined);
      if (!data) return reply.code(404).send({ error: 'not_found' });
      return reply.type(file.endsWith('.pdf') ? 'application/pdf' : 'audio/ogg').send(data);
    },
  );

  // The full card behind a WhatsApp link (and its PNG), by unguessable token.
  app.get(
    '/v1/public/cards/:token',
    {
      schema: {
        params: z.object({ token: z.string().regex(/^\w+$/) }),
        response: { 200: CardShare },
      },
    },
    async (request) => {
      const share = await getShare(request.params.token);
      if (!share) throw Object.assign(new Error('Card not found'), { statusCode: 404 });
      return share;
    },
  );

  app.get(
    '/v1/public/cards/:token/card.png',
    {
      schema: {
        params: z.object({ token: z.string().regex(/^\w+$/) }),
        querystring: z.object({ card: z.string().optional() }),
      },
    },
    async (request, reply) => {
      const share = await getShare(request.params.token);
      if (!share) return reply.code(404).send({ error: 'not_found' });
      return reply
        .type('image/png')
        .header('cache-control', 'public, max-age=3600')
        .send(renderCardPng(share, request.query.card));
    },
  );

  // In-app notifications (household alerts, reminders), including those WhatsApp couldn't carry.
  app.get(
    '/v1/households/:hid/notifications',
    {
      preHandler: requireUser,
      schema: { params: z.object({ hid: z.string() }), response: { 200: z.array(Notification) } },
    },
    async (request) => {
      const household = await loadHousehold(request, request.params.hid);
      return listNotifications(household.id);
    },
  );

  // Cloud Scheduler: send every household's reminders due today (demo households on their clock).
  app.post('/v1/admin/whatsapp/nudges', async (request, reply) => {
    if (header(request, 'x-admin-key') !== env.DEMO_ADMIN_KEY) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    const households = await store.list<Household>('households');
    const sent = await Promise.all(households.map((h) => sendDueNudges(h, householdToday(h))));
    return { sent: sent.flat().length };
  });

  if (devEnabled) await app.register(devRoutes);
};

/** Dev only: talk to the bot without Meta or Twilio, and read what it would have sent. */
const devRoutes: FastifyPluginAsyncZod = async (app) => {
  // Same fields as Twilio's form (From, Body, MediaUrl0, MediaContentType0), as a form, JSON or
  // multipart with the media as file parts. Processed before answering; returns what was sent.
  app.post('/v1/dev/whatsapp/inbound', async (request) => {
    const since = new Date().toISOString();
    const { fields, files } = await simulatorInput(request);
    if (!fields.From) throw Object.assign(new Error('From is required'), { statusCode: 400 });
    const from = fields.From.startsWith('whatsapp:') ? fields.From : `whatsapp:${fields.From}`;
    const inbound: Inbound = {
      ...parseTwilioForm({ ...fields, From: from, MessageSid: `sim_${crypto.randomUUID()}` }),
      simulated: true,
      householdId: fields.HouseholdId,
    };
    inbound.media.push(...files);
    await handleInbound(inbound);
    return { sent: await listOutbox({ since }) };
  });

  app.get(
    '/v1/dev/whatsapp/outbox',
    {
      schema: {
        querystring: z.object({ to: z.string().optional(), since: z.string().optional() }),
        response: { 200: z.array(WhatsAppOutboxMessage) },
      },
    },
    async (request) => listOutbox(request.query),
  );

  // Send a household's reminders due on a demo date, e.g. {"householdId": "...", "date": "2026-11-15"}.
  app.post(
    '/v1/dev/whatsapp/nudges',
    { schema: { body: z.object({ householdId: z.string(), date: z.iso.date() }) } },
    async (request) => {
      const household = await store.get<Household>('households', request.body.householdId);
      if (!household) throw Object.assign(new Error('Household not found'), { statusCode: 404 });
      return { notifications: await sendDueNudges(household, request.body.date) };
    },
  );
};

async function simulatorInput(request: FastifyRequest) {
  if (!request.isMultipart())
    return { fields: (request.body ?? {}) as Record<string, string>, files: [] };
  const fields: Record<string, string> = {};
  const files: MediaRef[] = [];
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      files.push({ data: await part.toBuffer(), mimeType: part.mimetype, filename: part.filename });
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }
  return { fields, files };
}

const header = (request: FastifyRequest, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};
