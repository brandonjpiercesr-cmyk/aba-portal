import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAD5sW9y0RriF8HsyS7twfd0bjgA2dGsQw",
  authDomain: "aba-central-brain.firebaseapp.com",
  databaseURL: "https://aba-central-brain-default-rtdb.firebaseio.com",
  projectId: "aba-central-brain",
  storageBucket: "aba-central-brain.firebasestorage.app",
  messagingSenderId: "280046049526",
  appId: "1:280046049526:web:4021ec007ca79c0e0cf4d7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ⬡B:aoa.audit_fix:FIX:H5_firebase_whitelist:20260404⬡
// Gate 1: Firebase email whitelist. Gate 2: BP2026 code.
// WARNING: No per-user role checking after auth. Everyone with email + code sees everything.
// Future: add trust-level-based page visibility (keys/killswitch/delete = T10 only).
const ADMIN_EMAILS = [
  'brandonjpiercesr@gmail.com',
  'brandon@globalmajoritygroup.com',
  'mr.brandonjpierce@gmail.com',
  'ericreeselanesr@gmail.com',
  'eric@globalmajoritygroup.com',
  'bryanjpiercejr@gmail.com',
  'raquelmbritton@gmail.com',
  'cj.d.moore32@gmail.com',
  'shields.devante@gmail.com',
  'bethanyppierce@gmail.com',
  'dmurrayjr34@gmail.com',
];

export { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, ADMIN_EMAILS };
