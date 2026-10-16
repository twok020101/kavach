import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { env } from '../env';

/** The Firebase Admin app, created on first use with application-default credentials. */
export function firebaseApp(): App {
  return getApps()[0] ?? initializeApp({ projectId: env.GOOGLE_CLOUD_PROJECT });
}
