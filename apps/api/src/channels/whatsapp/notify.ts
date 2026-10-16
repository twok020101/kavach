import { randomUUID } from 'node:crypto';
import { formatInr } from '@kavach/engine';
import type { DeskSession, Household, Notification, NotificationKind } from '@kavach/schemas';
import { answer, evaluateDesk } from '../../core/answer';
import { deskPatient } from '../../core/context';
import { store } from '../../store';
import { shareAnswer } from './cards';
import { notificationText, templateParams, type NotifyVars } from './copy';
import { adapters, deliver, inWindow } from './outbox';
import { getSender } from './senders';

const notifications = (hid: string) => `households/${hid}/notifications`;

/**
 * Tells a household member something Kavach noticed. It is always saved for the app; on WhatsApp
 * it goes free-form only inside the member's own 24-hour window, else as the approved Meta
 * template of the same name, else not at all (in-app only). Never free-form outside a window.
 *
 * Used by the household alert below, the job-change nudge (WP-9) and claim updates (WP-10).
 */
export async function notifyMember<K extends NotificationKind>(
  householdId: string,
  memberId: string,
  kind: K,
  vars: NotifyVars[K],
  opts: { refId?: string } = {},
): Promise<Notification> {
  const household = await store.get<Household>('households', householdId);
  const member = household?.members.find((m) => m.id === memberId);
  if (!household || !member) throw new Error(`No member ${memberId} in ${householdId}`);

  const text = notificationText(kind, vars, member.language);
  const sender = member.phone ? await getSender(member.phone) : undefined;
  const consented = sender
    ? Boolean(sender.consent?.grantedAt && !sender.consent.withdrawnAt)
    : Boolean(member.whatsappConsentAt);

  let channel: Notification['channel'] = 'in_app';
  let reason: string;
  if (!member.phone) reason = 'no WhatsApp number';
  else if (sender?.optedOut) reason = 'opted out of WhatsApp';
  else if (!consented) reason = 'no WhatsApp consent yet';
  else if (sender && inWindow(sender)) {
    await deliver(sender, { kind: 'text', text });
    channel = 'whatsapp_text';
    reason = 'inside 24-hour window';
  } else if (adapters.meta.configured() && !sender?.simulated) {
    await deliver(
      { e164: member.phone, provider: 'meta', simulated: false },
      {
        kind: 'template',
        name: kind,
        language: member.language,
        params: templateParams(kind, vars),
      },
    );
    channel = 'whatsapp_template';
    reason = 'outside 24-hour window: Meta template';
  } else {
    reason = 'outside 24-hour window and no approved template on this provider';
  }

  const notification: Notification = {
    id: `ntf_${randomUUID()}`,
    memberId,
    kind,
    text,
    link: vars.link,
    channel,
    reason,
    refId: opts.refId,
    createdAt: new Date().toISOString(),
  };
  await store.set(notifications(householdId), notification.id, notification);
  return notification;
}

export async function listNotifications(householdId: string) {
  const all = await store.list<Notification>(notifications(householdId));
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const PARENTS = ['parent', 'parent_in_law'];

/**
 * Household alert (W3): when a parent's desk session gets a room recommendation, through the app
 * or WhatsApp, tell the household owner once per session. Never throws into the desk.
 */
export async function alertHouseholdOwner(household: Household, session: DeskSession) {
  try {
    const owner = household.members.find((m) => m.relation === 'self');
    const patient = deskPatient(household, session.patientMemberId);
    const { estimate } = session;
    if (!owner || !estimate || estimate.needsConfirmation) return;
    if (!PARENTS.includes(patient.member.relation) || patient.policies.length === 0) return;

    const sentKey = `${household.id}_${session.id}`;
    if (await store.get('deskAlerts', sentKey)) return;
    await store.set('deskAlerts', sentKey, { at: new Date().toISOString() });

    const opts = { billingTypeAnswer: session.billingTypeAnswer };
    const ev = evaluateDesk(patient, estimate, opts);
    const rec = ev.primary.options.find(
      (o) => o.roomCategoryId === ev.primary.recommendedRoomCategoryId,
    )!;
    // The owner's own-language card for the link, from the same desk core.
    const ownerAnswer = answer(household, patient.member.id, { estimate, ...opts }, owner.language);
    const hospital = session.hospitalName ?? estimate.hospitalName;
    const share = await shareAnswer({
      answer: ownerAnswer,
      locale: owner.language,
      patientName: patient.member.name,
      hospitalName: hospital,
      isDemo: household.isDemo,
    });
    await notifyMember(
      household.id,
      owner.id,
      'household_alert',
      {
        patient: patient.member.name,
        hospital: hospital.split(',')[0]!.trim(),
        room: formatInr(rec.rentPerDay),
        link: share.pageUrl,
      },
      { refId: session.id },
    );
  } catch (error) {
    console.error('Household alert failed', error);
  }
}
