import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAPFzS6S2afwY96QmYt5Ppm4twzc2R0JZE',
  authDomain: 'm-passport.firebaseapp.com',
  projectId: 'm-passport',
  storageBucket: 'm-passport.firebasestorage.app',
  messagingSenderId: '242815874241',
  appId: '1:242815874241:web:7ba487b32802c866aad040',
  measurementId: 'G-YN3R1R1K5Z',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

function createAuth() {
  if (Platform.OS === 'web') return getAuth(app)
  try {
    const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js')
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  } catch {
    return getAuth(app)
  }
}

export const auth = createAuth()
export const db = getFirestore(app)

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
}
