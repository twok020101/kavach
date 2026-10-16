import { randomUUID } from 'node:crypto';
import { householdToday, plan } from '@kavach/engine';
import type {
  Action,
  ClaimCase,
  DeskSession,
  DocumentRecord,
  Household,
  LifeChangeRecord,
  TimelineEntry,
} from '@kavach/schemas';
import { listNotifications } from '../channels/whatsapp/notify';
import { store } from '../store';

const timelineOf = (hid: string) => `households/${hid}/timeline`;

/** Writes a timeline entry for something that has no collection of its own (setup, consent). */
export async function addTimeline(
  hid: string,
  entry: Omit<TimelineEntry, 'id' | 'at' | 'upcoming'>,
) {
  const id = `tl_${randomUUID()}`;
  await store.set(timelineOf(hid), id, {
    ...entry,
    id,
    at: new Date().toISOString(),
    upcoming: false,
  });
}

/**
 * S25: everything that happened to the household, newest first, plus the dates ahead on which
 * cover starts or ends. Read from each feature's own collection, so no feature has to write here.
 */
export async function buildTimeline(household: Household) {
  const hid = household.id;
  const list = <T>(name: string) => store.list<T>(`households/${hid}/${name}`);
  const [stored, documents, changes, actions, sessions, claims, notifications] = await Promise.all([
    list<TimelineEntry>('timeline'),
    list<DocumentRecord>('documents'),
    list<LifeChangeRecord>('lifeChanges'),
    list<Action>('actions'),
    list<DeskSession>('deskSessions'),
    list<ClaimCase>('claimCases'),
    listNotifications(hid),
  ]);
  const member = (id?: string) => household.members.find((m) => m.id === id)?.name ?? '';
  const policyName = (id: string) => {
    const p = household.policies.find((p) => p.id === id);
    return p?.employer ?? p?.productName ?? id;
  };
  const today = householdToday(household);

  const entries: TimelineEntry[] = [
    ...stored,
    ...documents.map((d) => ({
      id: d.id,
      kind: 'document_added' as const,
      at: d.createdAt,
      by: 'document' as const,
      params: { filename: d.filename, status: d.status },
      href: d.confirmedPolicyId ? `/policies/${d.confirmedPolicyId}` : '/policies',
    })),
    ...changes.map((c) => ({
      id: c.id,
      kind: 'life_change' as const,
      at: c.createdAt,
      by: 'you' as const,
      text: c.changeSet.summary,
      params: { effectiveDate: c.changeSet.effectiveDate },
      href: `/change/${c.id}`,
    })),
    ...actions.map((a) => ({
      id: a.id,
      kind: 'action' as const,
      at: a.createdAt,
      by: 'kavach' as const,
      text: a.title,
      params: { status: a.status },
      href: `/actions/${a.id}`,
    })),
    ...sessions.map((s) => ({
      id: s.id,
      kind: 'desk_session' as const,
      at: s.createdAt,
      by: 'you' as const,
      params: { name: member(s.patientMemberId), hospital: s.hospitalName ?? '' },
      href: `/desk/${s.id}/summary`,
    })),
    ...claims.map((c) => ({
      id: c.id,
      kind: 'claim_case' as const,
      at: c.createdAt,
      by: 'document' as const,
      params: { hospital: c.letter?.hospitalName ?? '', status: c.status },
      href: `/claims/${c.id}`,
    })),
    // Messages Kavach sent the family (Rahul's hospital alert, reminders), also shown in the app.
    ...notifications.map((n) => ({
      id: n.id,
      kind: 'notification' as const,
      at: n.createdAt,
      by: 'kavach' as const,
      text: n.text,
      params: { name: member(n.memberId), type: n.kind, channel: n.channel },
      href: n.link,
    })),
    ...plan(household).events.map((e) => ({
      id: `${e.kind}_${e.policyId}_${e.date}`,
      kind: e.kind,
      at: e.date,
      by: 'kavach' as const,
      params: { name: policyName(e.policyId) },
      href: '/home',
      upcoming: e.date > today,
    })),
  ].map((e) => ({ upcoming: false, ...e }));

  entries.sort((a, b) => b.at.localeCompare(a.at));
  return { today, entries };
}
