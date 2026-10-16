import type { Store } from './index';

/** In-process store for local development. Data is lost when the server restarts. */
export class MemoryStore implements Store {
  private readonly collections = new Map<string, Map<string, unknown>>();

  private collection(name: string) {
    let docs = this.collections.get(name);
    if (!docs) {
      docs = new Map();
      this.collections.set(name, docs);
    }
    return docs;
  }

  async get<T>(collection: string, id: string) {
    const doc = this.collection(collection).get(id);
    return doc === undefined ? undefined : (structuredClone(doc) as T);
  }

  async set<T extends object>(collection: string, id: string, data: T) {
    this.collection(collection).set(id, structuredClone(data));
  }

  async update(collection: string, id: string, patch: Record<string, unknown>) {
    const current = this.collection(collection).get(id);
    if (current === undefined) throw new Error(`${collection}/${id} not found`);
    this.collection(collection).set(id, { ...(current as object), ...structuredClone(patch) });
  }

  async list<T>(collection: string) {
    return [...this.collection(collection).values()].map((d) => structuredClone(d) as T);
  }

  async delete(collection: string, id: string) {
    this.collection(collection).delete(id);
  }
}
