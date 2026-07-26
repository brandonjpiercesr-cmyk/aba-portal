// ⬡B:lib.firebase:GUARD:identity_and_config_are_env_only:20260726⬡
// CLAIR FIX01 HOLE-3, adjacent finding, and it is worse than the brief said.
//
// Until 20260726 this file hardcoded, in shippable source:
//   the full Firebase project configuration as bare literals, so a stranger deploying this code
//   with no env set authenticated straight into the founder's own project, and
//   ELEVEN real personal email addresses as the admin allowlist, family members included.
//
// Under the founder's law of 20260722 a real person is never a literal in shippable code. Every
// world is someone else's; a hardcoded person is a human being leaked into every stranger's deploy.
// Both now come from env, and a missing value is a named error rather than a silent fallback.
//
// NEXT_PUBLIC_ADMIN_EMAILS is a comma separated list. It is NEXT_PUBLIC_ because this gate runs in
// the browser, which is also the honest reason it was never a real gate: an allowlist the client
// can read is a hint, not an authorization. The original file already carried that warning. It is
// still true, and this commit does not fix it: the real fix is a server-verified claim on the
// Firebase ID token. That is separate work and it is named here so it is not lost.

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      '[aba-portal] Required environment variable ' + name + ' is not set. Firebase configuration '
      + 'and the admin allowlist are env-only, never literals in source.'
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  databaseURL: requireEnv('NEXT_PUBLIC_FIREBASE_DATABASE_URL'),
  projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID')
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ⬡B:aoa.audit_fix:FIX:H5_firebase_whitelist:20260404⬡
// Gate 1: Firebase email allowlist. Gate 2: access code.
// WARNING, unchanged and still true: there is no per-user role checking after auth. Everyone who
// clears the allowlist and the code sees everything, and the allowlist itself is readable by the
// client. Future: trust-level based page visibility, checked on the server.
// ⬡B:lib.firebase:FIX:admin_emails_from_env_not_source:20260726⬡ An empty list means nobody is an
// admin. That is the correct failure: an unconfigured deploy locks itself, it does not fall back
// to somebody else's family.
const ADMIN_EMAILS = String(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(function (e) { return e.trim().toLowerCase(); })
  .filter(Boolean);

if (ADMIN_EMAILS.length === 0) {
  console.error('[aba-portal] NEXT_PUBLIC_ADMIN_EMAILS is not set. The admin allowlist is empty, so '
    + 'no account can pass the gate. Identity is env-only; it is never filled in from source.');
}

export { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, ADMIN_EMAILS };
