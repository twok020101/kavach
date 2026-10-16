import { DemoCheckpoint, StartDemoResponse } from '@kavach/schemas';
import { api } from './api';
import { getIdToken } from './firebase';

const HOUSEHOLD_KEY = 'kavach.householdId';

/** The household this browser is using, if any. Storage can be blocked, so failures mean "none". */
export function storedHouseholdId(): string | undefined {
  try {
    return localStorage.getItem(HOUSEHOLD_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberHouseholdId(householdId: string | undefined) {
  try {
    if (householdId) localStorage.setItem(HOUSEHOLD_KEY, householdId);
    else localStorage.removeItem(HOUSEHOLD_KEY);
  } catch {
    // Not remembered: the next visit starts a fresh demo.
  }
}

/** Starts a demo: the API clones the Sharma household for this visitor. Returns its id. */
export async function startDemo(checkpoint: DemoCheckpoint = 'hospital') {
  const { householdId } = await api(`/v1/public/demo?checkpoint=${checkpoint}`, StartDemoResponse, {
    method: 'POST',
    token: await getIdToken(),
  });
  rememberHouseholdId(householdId);
  return householdId;
}
