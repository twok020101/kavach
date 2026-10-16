import { randomUUID } from 'node:crypto';
import type { CardShare, DeskAnswer, Locale } from '@kavach/schemas';
import { env } from '../../env';
import { store } from '../../store';

const SHARES = 'cardShares';

export type SharedCard = { token: string; pageUrl: string; imageUrl: string };

/**
 * Saves a desk answer under an unguessable token so the WhatsApp reply can link to the full card
 * (`{web}/{locale}/c/{token}`) and attach its PNG (`{api}/v1/public/cards/{token}/card.png`).
 */
export async function shareAnswer(input: {
  answer: DeskAnswer;
  locale: Locale;
  patientName: string;
  hospitalName?: string;
  isDemo: boolean;
}): Promise<SharedCard> {
  const token = randomUUID().replaceAll('-', '');
  const share: CardShare = {
    token,
    locale: input.locale,
    patientName: input.patientName,
    hospitalName: input.hospitalName,
    text: input.answer.text,
    cards: input.answer.cards,
    isDemo: input.isDemo,
    createdAt: new Date().toISOString(),
  };
  await store.set(SHARES, token, share);
  return {
    token,
    pageUrl: `${env.PUBLIC_WEB_URL}/${input.locale}/c/${token}`,
    imageUrl: `${env.PUBLIC_API_URL}/v1/public/cards/${token}/card.png`,
  };
}

export const getShare = (token: string) => store.get<CardShare>(SHARES, token);
