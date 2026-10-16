import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../lib/firebase';
import type { Store } from './index';

/** Firestore-backed store. Uses the Cloud Run service identity, or GOOGLE_APPLICATION_CREDENTIALS locally. */
export class FirestoreStore implements Store {
  private db?: Firestore;

  private get firestore() {
    this.db ??= getFirestore(firebaseApp());
    return this.db;
  }

  async get<T>(collection: string, id: string) {
    const snap = await this.firestore.collection(collection).doc(id).get();
    return snap.exists ? (snap.data() as T) : undefined;
  }

  async set<T extends object>(collection: string, id: string, data: T) {
    await this.firestore.collection(collection).doc(id).set(stripUndefined(data));
  }

  async update(collection: string, id: string, patch: Record<string, unknown>) {
    await this.firestore.collection(collection).doc(id).update(stripUndefined(patch));
  }

  async list<T>(collection: string) {
    const snap = await this.firestore.collection(collection).get();
    return snap.docs.map((d) => d.data() as T);
  }

  async delete(collection: string, id: string) {
    await this.firestore.collection(collection).doc(id).delete();
  }
}

/** Firestore rejects `undefined` values; optional fields are simply left out. */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
