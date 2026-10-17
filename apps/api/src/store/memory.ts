import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../env';
import { repoRoot } from '../paths';
import type { Store } from './index';

/** Where the memory store is mirrored; `MEMORY_STORE_FILE=off` keeps it in memory only (tests). */
const FILE =
  env.MEMORY_STORE_FILE === 'off'
    ? undefined
    : resolve(repoRoot, env.MEMORY_STORE_FILE ?? '.data/store.json');

/**
 * In-process store for local development. Every write is mirrored (debounced) to a JSON file
 * under `.data`, and the file is loaded on boot, so a restart of the API no longer wipes the
 * families people set up while testing.
 */
export class MemoryStore implements Store {
  private readonly collections = new Map<string, Map<string, unknown>>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.load();
  }

  private load() {
    if (!FILE) return;
    try {
      const raw = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Record<string, unknown>>;
      for (const [name, docs] of Object.entries(raw)) {
        this.collections.set(name, new Map(Object.entries(docs)));
      }
    } catch {
      // No file yet, or not readable: start empty.
    }
  }

  private persist() {
    if (!FILE) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const out: Record<string, Record<string, unknown>> = {};
      for (const [name, docs] of this.collections) out[name] = Object.fromEntries(docs);
      try {
        mkdirSync(dirname(FILE), { recursive: true });
        const tmp = `${FILE}.tmp`;
        writeFileSync(tmp, JSON.stringify(out));
        renameSync(tmp, FILE);
      } catch {
        // Read-only disk: the data lives in memory for this run only.
      }
    }, 250);
    this.timer.unref?.();
  }

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
    this.persist();
  }

  async update(collection: string, id: string, patch: Record<string, unknown>) {
    const current = this.collection(collection).get(id);
    if (current === undefined) throw new Error(`${collection}/${id} not found`);
    this.collection(collection).set(id, { ...(current as object), ...structuredClone(patch) });
    this.persist();
  }

  async list<T>(collection: string) {
    return [...this.collection(collection).values()].map((d) => structuredClone(d) as T);
  }

  async delete(collection: string, id: string) {
    this.collection(collection).delete(id);
    this.persist();
  }
}
