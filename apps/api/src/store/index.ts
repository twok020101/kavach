import { env } from '../env';
import { FirestoreStore } from './firestore';
import { MemoryStore } from './memory';

/**
 * A minimal document store. Collections are slash paths such as
 * `households` or `households/{hid}/deskSessions`. Every feature reads and
 * writes through this, so it runs the same on Firestore and in memory.
 */
export interface Store {
  get<T>(collection: string, id: string): Promise<T | undefined>;
  set<T extends object>(collection: string, id: string, data: T): Promise<void>;
  update(collection: string, id: string, patch: Record<string, unknown>): Promise<void>;
  list<T>(collection: string): Promise<T[]>;
  delete(collection: string, id: string): Promise<void>;
}

export const store: Store = env.STORE === 'firestore' ? new FirestoreStore() : new MemoryStore();
