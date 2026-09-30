import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '../firebase'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('Firebase auth not initialized')
  const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password)
  return result.user
}

export async function registerWithEmail(email, password) {
  if (!auth) throw new Error('Firebase auth not initialized')
  const result = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password)
  return result.user
}

export async function signOutUser() {
  if (!auth) return
  await firebaseSignOut(auth)
}

export function authErrorMessage(err, t) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/invalid-email':
      return t.loginInvalidEmail
    case 'auth/user-disabled':
      return t.loginUserDisabled
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t.loginBadCredentials
    case 'auth/email-already-in-use':
      return t.loginEmailInUse
    case 'auth/weak-password':
      return t.loginWeakPassword
    case 'auth/too-many-requests':
      return t.loginTooMany
    case 'auth/network-request-failed':
      return t.loginNetwork
    default:
      return err?.message || t.loginError
  }
}
