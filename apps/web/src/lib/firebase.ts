import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * The Firebase ID token to send to the API, signing in anonymously on first use.
 * Returns undefined when Firebase isn't configured (local runs with AUTH_DISABLED=1).
 */
export async function getIdToken(): Promise<string | undefined> {
  if (!config.apiKey) return undefined;
  const auth = getAuth(getApps().length ? getApp() : initializeApp(config));
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return user.getIdToken();
}
