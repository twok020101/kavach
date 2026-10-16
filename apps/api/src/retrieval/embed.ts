import { createHash } from 'node:crypto';
import { env } from '../env';
import { genai, models } from '../lib/gemini';

export const EMBED_DIMENSIONS = 768;

/** Which embedder produced a vector. Vectors from different embedders are not comparable. */
export const embedderId = env.FAKE_LLM ? 'fake-bag-of-words-v1' : `${models.embed}@${EMBED_DIMENSIONS}`;

type Task = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/**
 * Embeds texts with the Gemini embedding model, or with a deterministic
 * bag-of-words hash when FAKE_LLM=1, so clause search still ranks sensibly offline.
 */
export async function embed(texts: string[], task: Task): Promise<number[][]> {
  if (env.FAKE_LLM) return texts.map(fakeEmbedding);

  const vectors: number[][] = [];
  // The API takes a limited batch per call.
  for (let i = 0; i < texts.length; i += 100) {
    const response = await genai().models.embedContent({
      model: models.embed,
      contents: texts.slice(i, i + 100),
      config: { taskType: task, outputDimensionality: EMBED_DIMENSIONS },
    });
    for (const e of response.embeddings ?? []) vectors.push(normalise(e.values ?? []));
  }
  if (vectors.length !== texts.length) throw new Error('Embedding count mismatch');
  return vectors;
}

export function cosine(a: number[], b: number[]) {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i]! * b[i]!;
  return dot; // Both vectors are unit length.
}

// Common English words plus words in nearly every clause, which would only add noise.
const STOPWORDS = new Set(
  (
    'a an and are as at be by for from has have if in is it its of on or per shall that the this to ' +
    'under up with which whichever any all not no do does may other than such these those ' +
    'company insured person policy hospital charge expense amount payable pay paid applied respect'
  ).split(' '),
);

/** Lowercase words minus stopwords, with a light plural strip ("deductions" → "deduction"). */
function words(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => !STOPWORDS.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

/** Hashed words and word pairs, count weighted, unit length. */
function fakeEmbedding(text: string) {
  const vector = new Array<number>(EMBED_DIMENSIONS).fill(0);
  const tokens = words(text);
  const features = [...tokens, ...tokens.slice(1).map((w, i) => `${tokens[i]} ${w}`)];
  const counts = new Map<string, number>();
  for (const f of features) counts.set(f, (counts.get(f) ?? 0) + 1);
  for (const [feature, count] of counts) {
    const hash = createHash('sha1').update(feature).digest();
    vector[hash.readUInt32BE(0) % EMBED_DIMENSIONS]! += count;
  }
  return normalise(vector);
}

function normalise(vector: number[]) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((v) => Math.round((v / length) * 1e5) / 1e5);
}
