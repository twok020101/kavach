import { randomUUID } from 'node:crypto';
import type { DemoCheckpoint, DemoPersona, Household } from '@kavach/schemas';
import { store } from '../store';
import { personaAt, personaOf } from './personas';

/** Per-household collections a reset clears, so every checkpoint starts clean. */
const HOUSEHOLD_COLLECTIONS = [
  'deskSessions',
  'claimCases',
  'actions',
  'documents',
  'lifeChanges',
  'notifications',
];

/** Clones a demo family at a checkpoint into a new household only `uid` can access. */
export async function createDemoHousehold(
  uid: string,
  checkpoint: DemoCheckpoint,
  persona: DemoPersona = 'sharma',
) {
  const household: Household = {
    ...personaAt(persona, checkpoint),
    id: `hh_demo_${randomUUID()}`,
    accessUids: [uid],
    isDemo: true,
    createdAt: new Date().toISOString(),
  };
  await store.set('households', household.id, household);
  return household;
}

/**
 * Puts a demo household back to a checkpoint in place, keeping its id and who can access it.
 * Without `persona` it stays the family it is; a scene of the other family switches it over.
 */
export async function resetDemoHousehold(
  current: Household,
  checkpoint: DemoCheckpoint,
  persona: DemoPersona = personaOf(current),
) {
  const household: Household = {
    ...personaAt(persona, checkpoint),
    id: current.id,
    accessUids: current.accessUids,
    isDemo: true,
    createdAt: current.createdAt,
  };
  await Promise.all(
    HOUSEHOLD_COLLECTIONS.map(async (name) => {
      const collection = `households/${current.id}/${name}`;
      const docs = await store.list<{ id: string }>(collection);
      await Promise.all(docs.map((doc) => store.delete(collection, doc.id)));
    }),
  );
  await store.set('households', household.id, household);
  return household;
}
