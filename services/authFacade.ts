/**
 * Authentication Facade
 *
 * This module provides authentication-related functions for the app.
 * It acts as a facade/wrapper around the main auth service.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { auth } from "./firebase";

const db = getFirestore();

/**
 * Initiates the sign-in flow
 */
export async function signInFlow(email: string, pin: string): Promise<void> {
  try {
    // Sign in with Firebase Auth using email and PIN as password
    // Firebase Auth is the source of truth for authentication
    await signInWithEmailAndPassword(auth, email, pin);
    console.log("Sign in successful:", email);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new Error("not_found");
    } else if (error.code === "auth/wrong-password") {
      throw new Error("invalid");
    }
    throw error;
  }
}

/**
 * Initiates the sign-up flow
 */
export async function signUpFlow(
  email: string,
  pin: string,
  fullName: string,
): Promise<void> {
  try {
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pin,
    );
    const user = userCredential.user;

    // Update Firebase Auth profile with the user's name
    await updateProfile(user, { displayName: fullName });

    // Store user data in Firestore (without PIN - Firebase Auth handles that securely)
    try {
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        fullName: fullName,
        createdAt: new Date().toISOString(),
        medications: [],
        emergencyContacts: [],
      });
    } catch (firestoreError) {
      console.warn(
        "Firestore save failed but user was created:",
        firestoreError,
      );
      // Continue anyway - user was created in Firebase Auth
    }

    console.log("Sign up successful:", email);
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      throw new Error("email_exists");
    } else if (error.code === "auth/weak-password") {
      throw new Error("weak_pin");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("invalid_email");
    }
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOutFlow(): Promise<void> {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}
