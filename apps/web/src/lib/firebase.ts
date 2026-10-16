import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False on local runs with AUTH_DISABLED=1: there is nothing to sign in to. */
export const firebaseEnabled = Boolean(config.apiKey);

async function auth() {
  const instance = getAuth(getApps().length ? getApp() : initializeApp(config));
  await instance.authStateReady();
  return instance;
}

/**
 * The Firebase ID token to send to the API, signing in anonymously on first use.
 * Returns undefined when Firebase isn't configured (local runs with AUTH_DISABLED=1).
 */
export async function getIdToken(): Promise<string | undefined> {
  if (!firebaseEnabled) return undefined;
  const a = await auth();
  const user = a.currentUser ?? (await signInAnonymously(a)).user;
  return user.getIdToken();
}

/** S02 "Continue with Google". Returns the person's first name when known. */
export async function signInWithGoogle(): Promise<string | undefined> {
  if (!firebaseEnabled) return undefined;
  const { user } = await signInWithPopup(await auth(), new GoogleAuthProvider());
  return user.displayName?.split(' ')[0];
}

/** S02 "Continue without an account": an anonymous login (kept on this device). */
export async function signInAsGuest() {
  if (firebaseEnabled) await getIdToken();
}

/** The signed-in person's first name, if the login has one. */
export async function signedInName(): Promise<string | undefined> {
  if (!firebaseEnabled) return undefined;
  return (await auth()).currentUser?.displayName?.split(' ')[0];
}

export async function signOutUser() {
  if (firebaseEnabled) await signOut(await auth());
}
