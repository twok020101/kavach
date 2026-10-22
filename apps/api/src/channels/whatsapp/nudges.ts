import type { Action, Household, Locale, Notification, WhatsAppSender } from '@kavach/schemas';
import { blobs } from '../../lib/blobs';
import { dueReminderNudges, markNudgeSent } from '../../letters/nudges';
import { store } from '../../store';
import { WA_COPY } from './copy';
import { notifyMember } from './notify';
import { deliver } from './outbox';
import { getSender, saveSender } from './senders';

/**
 * Sends the dated reminders due on `date` (W4) through the outbound sender: template
 * `dated_reminder`, free-form inside the window, or in-app only. A reminder about a letter
 * leaves the letter pending on the number, so "YES" gets the PDF.
 */
export async function sendDueNudges(household: Household, date: string) {
  const sent: Notification[] = [];
  for (const nudge of await dueReminderNudges(household, date)) {
    if (!nudge.memberId) continue;
    // Reminder text reads "15 Nov: ask Acme HR…"; the template takes date and action apart.
    const [head, ...rest] = nudge.text.split(': ');
    const vars = rest.length
      ? { date: head!, action: rest.join(': ') }
      : { date: nudge.dueDate, action: nudge.text };
    const notification = await notifyMember(household.id, nudge.memberId, 'dated_reminder', vars, {
      refId: nudge.actionId,
    });
    if (notification.channel !== 'in_app' && nudge.phone && nudge.relatedActionId) {
      const sender = await getSender(nudge.phone);
      if (sender) {
        sender.pendingLetter = { householdId: household.id, actionId: nudge.relatedActionId };
        await saveSender(sender);
      }
    }
    await markNudgeSent(household.id, nudge.actionId);
    sent.push(notification);
  }
  return sent;
}

/** "YES" after a reminder: send the approved letter as a PDF, or say it still needs approving. */
export async function sendPendingLetter(sender: WhatsAppSender, lang: Locale) {
  const pending = sender.pendingLetter!;
  const action = await store.get<Action>(
    `households/${pending.householdId}/actions`,
    pending.actionId,
  );
  if (!action?.pdfPath) {
    await deliver(sender, { kind: 'text', text: WA_COPY[lang].letterNotApproved });
    return;
  }
  await deliver(sender, {
    kind: 'document',
    data: await blobs.get(action.pdfPath),
    filename: `kavach-${action.kind.replaceAll('_', '-')}.pdf`,
  });
  sender.pendingLetter = undefined;
  await saveSender(sender);
}
