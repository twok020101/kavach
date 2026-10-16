import type { Locale, NotificationKind, WhatsAppProvider } from '@kavach/schemas';

/** A media item in an inbound message, downloaded only after the sender has consented. */
export type MediaRef = {
  mimeType: string;
  filename?: string;
  /** Meta media id or Twilio MediaUrl. */
  ref?: string;
  /** Bytes the dev simulator already has. */
  data?: Buffer;
};

export type Media = { data: Buffer; mimeType: string; filename?: string };

/** One inbound WhatsApp message, the same shape from both providers and the simulator. */
export type Inbound = {
  provider: WhatsAppProvider;
  /** Provider message id; repeats are ignored. */
  messageId: string;
  /** E.164 with a leading +. */
  from: string;
  text?: string;
  media: MediaRef[];
  simulated?: boolean;
  /** Simulator only: link the number to this household first. */
  householdId?: string;
};

/** What Kavach sends. Audio is OGG/Opus, served from a public URL to both providers. */
export type Outgoing =
  | { kind: 'text'; text: string }
  | { kind: 'image'; url: string; caption?: string }
  | { kind: 'audio'; data: Buffer }
  | { kind: 'document'; data: Buffer; filename: string }
  | { kind: 'template'; name: NotificationKind; language: Locale; params: string[] };

/** Outgoing with audio already stored and given a URL. */
export type Sendable =
  | Exclude<Outgoing, { kind: 'audio' | 'document' }>
  | { kind: 'audio'; url: string }
  | { kind: 'document'; url: string; filename: string };

export interface ProviderAdapter {
  /** True when this provider's keys are set, so messages are really sent. */
  configured(): boolean;
  download(media: MediaRef): Promise<Buffer>;
  /** Best effort: remove the inbound media from the provider once processed. */
  deleteMedia?(media: MediaRef): Promise<void>;
  send(to: string, message: Sendable): Promise<void>;
}
