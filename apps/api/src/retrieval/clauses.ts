import { Clause, StoredClause } from '@kavach/schemas';
import { z } from 'zod';
import { store } from '../store';
import { cosine, embed, embedderId } from './embed';
import seed from './seed-clauses.json' with { type: 'json' };

/** The clause library: one document per clause, id `${productKey}__${ref}`. */
const COLLECTION = 'clauses';

export const clauseId = (productKey: string, ref: string) => `${productKey}__${ref}`;

/** A product key safe to use in ids: the UIN, or the policy number when no UIN is printed. */
export function productKeyFor(policy: { uin?: string; policyNumber?: string }) {
  const raw = policy.uin ?? policy.policyNumber;
  return raw?.replace(/[^A-Za-z0-9-]+/g, '-');
}

/** Embeds clauses (unless they already carry vectors from the current embedder) and stores them. */
export async function saveClauses(clauses: (Clause & Partial<StoredClause>)[]) {
  const fresh = clauses.filter((c) => c.embeddingModel !== embedderId || !c.embedding);
  const vectors = await embed(
    fresh.map((c) => c.text),
    'RETRIEVAL_DOCUMENT',
  );
  const stored = clauses.map((c) => {
    const index = fresh.indexOf(c);
    return StoredClause.parse(
      index === -1 ? c : { ...c, embedding: vectors[index], embeddingModel: embedderId },
    );
  });
  await Promise.all(stored.map((c) => store.set(COLLECTION, c.id, c)));
  return stored;
}

/** Loads the committed Sharma clause library (written by scripts/ingest-wordings.ts). */
export async function seedClauses() {
  const clauses = z.array(StoredClause).parse(seed);
  await saveClauses(clauses);
  return clauses.length;
}

export async function getClause(id: string): Promise<Clause | undefined> {
  const stored = await store.get<StoredClause>(COLLECTION, id);
  return stored && withoutEmbedding(stored);
}

/** Every clause in the library, optionally of one product, in clause order. */
export async function listClauses(productKey?: string): Promise<Clause[]> {
  const stored = await store.list<StoredClause>(COLLECTION);
  return stored
    .filter((c) => !productKey || c.productKey === productKey)
    .map(withoutEmbedding)
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}

/** Clauses most similar to the query (cosine), optionally within one product. */
export async function searchClauses(query: string, productKey?: string, limit = 5) {
  const [queryVector] = await embed([query], 'RETRIEVAL_QUERY');
  const clauses = (await store.list<StoredClause>(COLLECTION)).filter(
    (c) => (!productKey || c.productKey === productKey) && c.embeddingModel === embedderId,
  );
  return clauses
    .map((c) => ({ clause: withoutEmbedding(c), score: cosine(queryVector!, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Parsing with the plain Clause schema drops the embedding fields. */
const withoutEmbedding = (stored: StoredClause): Clause => Clause.parse(stored);
