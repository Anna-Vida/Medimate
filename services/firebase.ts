import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  // @ts-expect-error - getReactNativePersistence is missing from some Firebase auth types but works in React Native
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "medimate-79755.firebaseapp.com",
  projectId: "medimate-79755",
  storageBucket: "medimate-79755.firebasestorage.app",
  messagingSenderId: "752826515940",
  appId: "1:752826515940:web:e8926f5c8a5be2772647f1",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Set up auth with persistence
// We use a robust initialization for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
export default app;
