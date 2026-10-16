import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../env';
import type { Inbound, MediaRef, ProviderAdapter, Sendable } from './types';

/** Meta WhatsApp Cloud API (the test number used for the video). */
const GRAPH = 'https://graph.facebook.com/v23.0';

/** `X-Hub-Signature-256: sha256=<hex HMAC of the raw body with the app secret>`. */
export function verifyMetaSignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!env.META_APP_SECRET || !header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', env.META_APP_SECRET).update(rawBody).digest();
  const given = Buffer.from(header.slice('sha256='.length), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type MetaMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
};

type MetaWebhook = {
  entry?: { changes?: { value?: { messages?: MetaMessage[] } }[] }[];
};

/** Inbound messages in a webhook body; delivery statuses are ignored. */
export function parseMetaWebhook(body: unknown): Inbound[] {
  const messages = ((body as MetaWebhook).entry ?? []).flatMap((e) =>
    (e.changes ?? []).flatMap((c) => c.value?.messages ?? []),
  );
  return messages.map((m) => {
    const media: MediaRef[] = [];
    const file = m.image ?? m.audio ?? m.document;
    if (file) {
      media.push({
        ref: file.id,
        mimeType: file.mime_type.split(';')[0]!.trim(),
        filename: m.document?.filename,
      });
    }
    return {
      provider: 'meta',
      messageId: m.id,
      from: `+${m.from}`,
      text: m.text?.body ?? m.image?.caption ?? m.document?.caption,
      media,
    };
  });
}

const auth = () => ({ authorization: `Bearer ${env.META_WHATSAPP_TOKEN}` });

async function graph(path: string, init: RequestInit = {}) {
  const response = await fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: { ...auth(), ...init.headers },
  });
  if (!response.ok) throw new Error(`Meta ${path}: ${response.status} ${await response.text()}`);
  return response;
}

export const meta: ProviderAdapter = {
  configured: () => Boolean(env.META_WHATSAPP_TOKEN && env.META_WHATSAPP_PHONE_NUMBER_ID),

  // Media id → short-lived URL → bytes, both with the token.
  async download(media) {
    const { url } = (await (await graph(media.ref!)).json()) as { url: string };
    const response = await fetch(url, { headers: auth() });
    if (!response.ok) throw new Error(`Meta media download: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  },

  async send(to, message: Sendable) {
    const body = {
      messaging_product: 'whatsapp',
      to: to.replace(/^\+/, ''),
      ...toMeta(message),
    };
    await graph(`${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
};

function toMeta(message: Sendable) {
  switch (message.kind) {
    case 'text':
      return { type: 'text', text: { body: message.text, preview_url: true } };
    case 'image':
      return { type: 'image', image: { link: message.url, caption: message.caption } };
    case 'audio':
      return { type: 'audio', audio: { link: message.url } };
    case 'document':
      return { type: 'document', document: { link: message.url, filename: message.filename } };
    case 'template':
      return {
        type: 'template',
        template: {
          name: message.name,
          language: { code: message.language },
          components: [
            {
              type: 'body',
              parameters: message.params.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      };
  }
}
