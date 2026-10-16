import { getAuth } from 'firebase-admin/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Household } from '@kavach/schemas';
import { env } from './env';
import { firebaseApp } from './lib/firebase';
import { store } from './store';

declare module 'fastify' {
  interface FastifyRequest {
    uid: string;
  }
}

/** Local-dev user when AUTH_DISABLED=1. */
const DEV_UID = 'dev-user';

/** preHandler: verifies the Firebase ID token and sets `request.uid`. */
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  if (env.AUTH_DISABLED) {
    request.uid = DEV_UID;
    return;
  }
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return reply.code(401).send({ error: 'missing_token' });
  try {
    request.uid = (await getAuth(firebaseApp()).verifyIdToken(token)).uid;
  } catch {
    return reply.code(401).send({ error: 'invalid_token' });
  }
}

/** Loads a household the caller may access, or throws a 404 (never reveals it exists). */
export async function loadHousehold(request: FastifyRequest, householdId: string) {
  const household = await store.get<Household>('households', householdId);
  const allowed = env.AUTH_DISABLED || household?.accessUids.includes(request.uid);
  if (!household || !allowed) {
    throw Object.assign(new Error('Household not found'), { statusCode: 404 });
  }
  return household;
}
