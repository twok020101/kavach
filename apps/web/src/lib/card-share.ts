import { CardShare } from '@kavach/schemas';
import { apiUrl } from './api';

/** A desk answer shared from WhatsApp, by its link token; undefined when it doesn't exist. */
export async function fetchCardShare(token: string): Promise<CardShare | undefined> {
  if (!/^\w+$/.test(token)) return undefined;
  const response = await fetch(`${apiUrl}/v1/public/cards/${token}`, { cache: 'no-store' });
  if (!response.ok) return undefined;
  return CardShare.parse(await response.json());
}
