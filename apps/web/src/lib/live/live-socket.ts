import { LiveServerMessage, type LiveClientMessage, type LiveErrorCode } from '@kavach/schemas';
import { apiUrl } from '../api';
import { getIdToken } from '../firebase';
import { loadCurrentHousehold } from '../household';
import { storedHouseholdId } from '../session';

/** Waits between reconnect attempts; after the last one the desk falls back to text. */
const BACKOFF_MS = [500, 1000, 2000, 4000];
const PING_MS = 15_000;

export type LiveSocketEvents = {
  message(message: LiveServerMessage): void;
  /** Lost the connection and trying again (attempt 1…n). */
  reconnecting(attempt: number): void;
  /** Gave up on live: the server said so, or every reconnect failed. */
  fallback(code: LiveErrorCode | 'connection_lost'): void;
};

/**
 * The browser end of `/v1/live/{sessionId}`. Reconnects with backoff (the server resumes the
 * same model session), sends a heartbeat, and drops outgoing audio while disconnected.
 */
export class LiveSocket {
  private ws?: WebSocket;
  private attempt = 0;
  private closed = false;
  private ping?: ReturnType<typeof setInterval>;

  constructor(
    private readonly sessionId: string,
    private readonly language: string,
    private readonly on: LiveSocketEvents,
  ) {}

  async connect() {
    const householdId = storedHouseholdId() ?? (await loadCurrentHousehold()).id;
    const url = new URL(`/v1/live/${this.sessionId}`, apiUrl.replace(/^http/, 'ws'));
    url.searchParams.set('hid', householdId);
    url.searchParams.set('language', this.language);
    const token = await getIdToken();
    if (token) url.searchParams.set('token', token);
    if (this.closed) return;

    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.send({ type: 'hello', language: this.language === 'en' ? 'en' : 'hi' });
      this.ping = setInterval(() => this.send({ type: 'ping' }), PING_MS);
    };
    ws.onmessage = (event) => {
      const parsed = LiveServerMessage.safeParse(JSON.parse(String(event.data)));
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === 'ready') this.attempt = 0;
      if (message.type === 'error' && message.fallback) return this.giveUp(message.code);
      this.on.message(message);
    };
    ws.onclose = () => {
      clearInterval(this.ping);
      if (this.closed || ws !== this.ws) return;
      const wait = BACKOFF_MS[this.attempt];
      if (wait === undefined) return this.giveUp('connection_lost');
      this.attempt++;
      this.on.reconnecting(this.attempt);
      setTimeout(() => void this.connect().catch(() => this.giveUp('connection_lost')), wait);
    };
  }

  send(message: LiveClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  /** Ends the live session for good (the server forgets the resumption handle). */
  end() {
    this.send({ type: 'end' });
    this.close();
  }

  close() {
    this.closed = true;
    clearInterval(this.ping);
    this.ws?.close();
  }

  private giveUp(code: LiveErrorCode | 'connection_lost') {
    if (this.closed) return;
    this.close();
    this.on.fallback(code);
  }
}
