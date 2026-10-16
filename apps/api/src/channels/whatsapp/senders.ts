import type { Household, Member, WhatsAppProvider, WhatsAppSender } from '@kavach/schemas';
import { createDemoHousehold } from '../../demo';
import { store } from '../../store';
import { CONSENT_VERSION } from './copy';

const SENDERS = 'whatsappSenders';
const RATE_LIMIT = { max: 20, windowMs: 10 * 60 * 1000 };

export const getSender = (e164: string) => store.get<WhatsAppSender>(SENDERS, e164);
export const saveSender = (sender: WhatsAppSender) => store.set(SENDERS, sender.e164, sender);

/** Records an inbound message: provider, last inbound time (opens the 24-hour window). */
export async function touchSender(
  e164: string,
  provider: WhatsAppProvider,
  simulated: boolean,
): Promise<WhatsAppSender> {
  const current = await getSender(e164);
  const sender: WhatsAppSender = {
    ...(current ?? { e164, optedOut: false, simulated }),
    provider,
    simulated: simulated || (current?.simulated ?? false),
    lastInboundAt: new Date().toISOString(),
  };
  await saveSender(sender);
  return sender;
}

/** Counts this message; false once the number is over its limit for the current window. */
export async function withinRateLimit(
  sender: WhatsAppSender,
): Promise<{ ok: boolean; justHit: boolean }> {
  const now = Date.now();
  const fresh =
    !sender.rateWindow || now - Date.parse(sender.rateWindow.startedAt) > RATE_LIMIT.windowMs;
  const rateWindow = fresh
    ? { startedAt: new Date(now).toISOString(), count: 1 }
    : { ...sender.rateWindow!, count: sender.rateWindow!.count + 1 };
  sender.rateWindow = rateWindow;
  await saveSender(sender);
  return {
    ok: rateWindow.count <= RATE_LIMIT.max,
    justHit: rateWindow.count === RATE_LIMIT.max + 1,
  };
}

/**
 * The household and member for a number. An unlinked number is matched against `Member.phone`
 * (newest household first) and linked, so later messages don't scan.
 */
export async function resolveMember(
  sender: WhatsAppSender,
): Promise<{ household: Household; member: Member } | undefined> {
  if (sender.householdId) {
    const household = await store.get<Household>('households', sender.householdId);
    const member = household?.members.find((m) => m.id === sender.memberId);
    if (household && member) return { household, member };
  }
  const households = await store.list<Household>('households');
  const match = households
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((household) => ({
      household,
      member: household.members.find((m) => m.phone === sender.e164),
    }))
    .find((x) => x.member);
  if (!match) return undefined;
  await link(sender, match.household.id, match.member!.id);
  return { household: match.household, member: match.member! };
}

export async function link(sender: WhatsAppSender, householdId: string, memberId: string) {
  Object.assign(sender, { householdId, memberId, deskSessionId: undefined });
  await saveSender(sender);
}

/**
 * Judge flow: "RAHUL" gives this number its own demo family (hospital checkpoint) with the
 * number as Rahul's, so the household alert reaches the judge's phone.
 */
export async function linkDemoOwner(sender: WhatsAppSender) {
  const demo = await createDemoHousehold(`whatsapp:${sender.e164}`, 'hospital');
  const owner = demo.members.find((m) => m.relation === 'self')!;
  const members = demo.members.map((m) => (m.id === owner.id ? { ...m, phone: sender.e164 } : m));
  await store.update('households', demo.id, { members });
  await link(sender, demo.id, owner.id);
  return { household: { ...demo, members }, member: { ...owner, phone: sender.e164 } };
}

export const hasConsent = (sender: WhatsAppSender) =>
  Boolean(sender.consent?.grantedAt && !sender.consent.withdrawnAt);

/** Stores the opt-in on the number and on the member (`whatsappConsentAt`). */
export async function grantConsent(sender: WhatsAppSender, household: Household, memberId: string) {
  const at = new Date().toISOString();
  sender.consent = { grantedAt: at, version: CONSENT_VERSION };
  sender.optedOut = false;
  await saveSender(sender);
  const members = household.members.map((m) =>
    m.id === memberId ? { ...m, whatsappConsentAt: at } : m,
  );
  await store.update('households', household.id, { members });
}

/** "STOP": withdraws consent and turns off proactive messages. */
export async function optOut(sender: WhatsAppSender) {
  sender.optedOut = true;
  sender.consent = {
    ...(sender.consent ?? { version: CONSENT_VERSION }),
    withdrawnAt: new Date().toISOString(),
  };
  await saveSender(sender);
}
