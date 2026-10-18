import { DemoCheckpoint, StartDemoResponse } from '@kavach/schemas';
import { useSyncExternalStore } from 'react';
import { api } from './api';
import { getIdToken } from './firebase';

const HOUSEHOLD_KEY = 'kavach.householdId';
const MEMBER_KEY = 'kavach.memberId';

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

/**
 * Which family member this device belongs to, when the login came through an invite
 * (Kamala's phone → mem_kamala). Decides the simple member home (S09m). Owners have none.
 */
export function storedMemberId(): string | undefined {
  try {
    return localStorage.getItem(MEMBER_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

const memberListeners = new Set<() => void>();

export function rememberMemberId(memberId: string | undefined) {
  try {
    if (memberId) localStorage.setItem(MEMBER_KEY, memberId);
    else localStorage.removeItem(MEMBER_KEY);
  } catch {
    // Falls back to the full home.
  }
  memberListeners.forEach((fn) => fn());
}

/** The stored member id as React state (undefined on the server and for owners). */
export function useStoredMemberId() {
  return useSyncExternalStore(
    (fn) => {
      memberListeners.add(fn);
      return () => memberListeners.delete(fn);
    },
    storedMemberId,
    () => undefined,
  );
}

/** Starts a demo: the API clones the Sharma household for this visitor. Returns its id. */
export async function startDemo(checkpoint: DemoCheckpoint = 'hospital') {
  const { householdId } = await api(`/v1/public/demo?checkpoint=${checkpoint}`, StartDemoResponse, {
    method: 'POST',
    token: await getIdToken(),
  });
  rememberHouseholdId(householdId);
  rememberMemberId(undefined);
  return householdId;
}
