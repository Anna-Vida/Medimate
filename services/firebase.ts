import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAxR3V9-1eVkzReNw4zn0vDC0vSRVjn08g",
    authDomain: "medimate-79755.firebaseapp.com",
    projectId: "medimate-79755",
    storageBucket: "medimate-79755.firebasestorage.app",
    messagingSenderId: "752826515940",
    appId: "1:752826515940:web:e8926f5c8a5be2772647f1"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Set up auth with persistence
let auth: any;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (e) {
    auth = getAuth(app);
}

export { auth };
export default app;
