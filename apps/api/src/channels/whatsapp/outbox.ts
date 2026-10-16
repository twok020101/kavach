import { randomUUID } from 'node:crypto';
import type { WhatsAppOutboxMessage, WhatsAppProvider, WhatsAppSender } from '@kavach/schemas';
import { env } from '../../env';
import { blobs } from '../../lib/blobs';
import { store } from '../../store';
import { meta } from './meta';
import { twilio } from './twilio';
import type { Outgoing, ProviderAdapter, Sendable } from './types';

export const adapters: Record<WhatsAppProvider, ProviderAdapter> = { meta, twilio };

const OUTBOX = 'whatsappOutbox';
/** A few minutes short of 24 h, so a reply never lands just outside the window. */
const WINDOW_MS = 24 * 60 * 60 * 1000 - 5 * 60 * 1000;

/** True while the number's last inbound message is under 24 hours old (free-form allowed). */
export function inWindow(sender: WhatsAppSender | undefined, now = Date.now()): boolean {
  if (!sender?.lastInboundAt) return false;
  return now - Date.parse(sender.lastInboundAt) < WINDOW_MS;
}

/** Public URL of a stored outbound media file (voice notes). */
export const mediaUrl = (file: string) => `${env.PUBLIC_API_URL}/v1/public/whatsapp/media/${file}`;
export const mediaBlobPath = (file: string) => `whatsapp/out/${file}`;

/**
 * Sends one message to a number through its provider. Simulated numbers, and providers with no
 * keys, get the message recorded in `whatsappOutbox` instead (text kept only then, for the dev
 * outbox; real sends keep no message text).
 */
export async function deliver(
  sender: Pick<WhatsAppSender, 'e164' | 'provider' | 'simulated'>,
  message: Outgoing,
): Promise<WhatsAppOutboxMessage> {
  const id = `wam_${randomUUID()}`;
  let sendable: Sendable;
  if (message.kind === 'audio') {
    const file = `${id}.ogg`;
    await blobs.put(mediaBlobPath(file), message.data, 'audio/ogg');
    sendable = { kind: 'audio', url: mediaUrl(file) };
  } else if (message.kind === 'document') {
    const file = `${id}.pdf`;
    await blobs.put(mediaBlobPath(file), message.data, 'application/pdf');
    sendable = { kind: 'document', url: mediaUrl(file), filename: message.filename };
  } else {
    sendable = message;
  }

  const adapter = adapters[sender.provider];
  const live = !sender.simulated && adapter.configured();
  if (live) await adapter.send(sender.e164, sendable);

  const record: WhatsAppOutboxMessage = {
    id,
    provider: sender.provider,
    to: sender.e164,
    kind: sendable.kind,
    text: live
      ? undefined
      : sendable.kind === 'text'
        ? sendable.text
        : sendable.kind === 'image'
          ? sendable.caption
          : sendable.kind === 'document'
            ? sendable.filename
            : undefined,
    mediaUrl: 'url' in sendable ? sendable.url : undefined,
    template:
      sendable.kind === 'template'
        ? { name: sendable.name, language: sendable.language, params: live ? [] : sendable.params }
        : undefined,
    delivered: live,
    at: new Date().toISOString(),
  };
  await store.set(OUTBOX, id, record);
  return record;
}

/** Recorded messages, oldest first; for the dev outbox. */
export async function listOutbox(filter: { to?: string; since?: string } = {}) {
  const all = await store.list<WhatsAppOutboxMessage>(OUTBOX);
  return all
    .filter((m) => !filter.to || m.to === filter.to)
    .filter((m) => !filter.since || m.at >= filter.since)
    .sort((a, b) => a.at.localeCompare(b.at));
}
