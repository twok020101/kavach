import type { Action, Household } from '@kavach/schemas';
import { store } from '../store';

/** A dated reminder ready to send on WhatsApp ("15 Nov: ask Acme HR to migrate Mummy and Papa's cover…"). */
export type ReminderNudge = {
  householdId: string;
  actionId: string;
  /** The member to message, and their WhatsApp number if known. */
  memberId?: string;
  phone?: string;
  dueDate: string;
  text: string;
  /** The letter the reminder is about (its PDF once approved), if any. */
  relatedActionId?: string;
};

/**
 * Hook for the WhatsApp feature: reminders due on or before `date` that haven't been sent or dismissed.
 * The caller sends them, then calls markNudgeSent. Kavach drafts these when a life change is recorded.
 */
export async function dueReminderNudges(household: Household, date: string): Promise<ReminderNudge[]> {
  const actions = await store.list<Action>(`households/${household.id}/actions`);
  return actions
    .filter(
      (a) =>
        a.kind === 'reminder' &&
        (a.status === 'draft' || a.status === 'approved') &&
        !!a.dueDate &&
        a.dueDate <= date,
    )
    .map((a) => ({
      householdId: household.id,
      actionId: a.id,
      memberId: a.memberId,
      phone: household.members.find((m) => m.id === a.memberId)?.phone,
      dueDate: a.dueDate!,
      text: a.content,
      relatedActionId: a.relatedActionId,
    }));
}

/** Marks a reminder as sent, so it isn't sent twice. */
export async function markNudgeSent(householdId: string, actionId: string) {
  await store.update(`households/${householdId}/actions`, actionId, { status: 'done' });
}
