import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../env';
import type { Inbound, MediaRef, ProviderAdapter } from './types';

/** Twilio WhatsApp Sandbox (used by judges). */

/**
 * `X-Twilio-Signature`: base64 HMAC-SHA1, keyed with the auth token, of the full webhook URL
 * followed by every POST field (sorted by name) as name + value.
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  header: string | undefined,
): boolean {
  if (!env.TWILIO_AUTH_TOKEN || !header) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  const expected = createHmac('sha1', env.TWILIO_AUTH_TOKEN).update(data).digest();
  const given = Buffer.from(header, 'base64');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Twilio's form fields (also what the dev simulator accepts). */
export function parseTwilioForm(form: Record<string, string>): Inbound {
  const count = Number(form.NumMedia ?? 0);
  const media: MediaRef[] = [];
  for (let i = 0; i < Math.max(count, form.MediaUrl0 ? 1 : 0); i++) {
    const url = form[`MediaUrl${i}`];
    if (url) media.push({ ref: url, mimeType: form[`MediaContentType${i}`] ?? '' });
  }
  return {
    provider: 'twilio',
    messageId: form.MessageSid ?? form.SmsMessageSid ?? `sim_${Date.now()}`,
    from: `+${(form.From ?? '').replace(/^whatsapp:/, '').replace(/\D/g, '')}`,
    text: form.Body,
    media,
  };
}

const basicAuth = () =>
  `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`;

const isTwilioUrl = (url: string) => new URL(url).hostname === 'api.twilio.com';

export const twilio: ProviderAdapter = {
  configured: () =>
    Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM),

  async download(media) {
    // Twilio media needs basic auth; the redirect to its storage drops the header itself.
    const headers = isTwilioUrl(media.ref!) ? { authorization: basicAuth() } : undefined;
    const response = await fetch(media.ref!, { headers });
    if (!response.ok) throw new Error(`Twilio media download: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  },

  async deleteMedia(media) {
    if (!media.ref || !isTwilioUrl(media.ref) || !this.configured()) return;
    await fetch(media.ref, { method: 'DELETE', headers: { authorization: basicAuth() } });
  },

  async send(to, message) {
    const form = new URLSearchParams({
      From: env.TWILIO_WHATSAPP_FROM!,
      To: `whatsapp:${to}`,
    });
    if (message.kind === 'text') form.set('Body', message.text);
    if (message.kind === 'image') {
      form.set('MediaUrl', message.url);
      if (message.caption) form.set('Body', message.caption);
    }
    if (message.kind === 'audio' || message.kind === 'document') form.set('MediaUrl', message.url);
    // The sandbox can't send custom templates; the outbound sender never asks it to.
    if (message.kind === 'template') throw new Error('Twilio sandbox cannot send templates');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      { method: 'POST', headers: { authorization: basicAuth() }, body: form },
    );
    if (!response.ok) throw new Error(`Twilio send: ${response.status} ${await response.text()}`);
  },
};
