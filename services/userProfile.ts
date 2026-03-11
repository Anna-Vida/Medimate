import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserScopedKey } from "./userScopedStorage";

export const PROFILE_KEY = "user_profile";
const USER_EMAIL_KEY = "user_email";
const USER_PHONE_KEY = "user_phone";
const USER_NAME_KEY = "user_name";
const LEGACY_MIGRATION_FLAG_KEY = "legacy_data_migrated_global";

const LEGACY_SHARED_KEYS = [
  PROFILE_KEY,
  USER_EMAIL_KEY,
  USER_PHONE_KEY,
  USER_NAME_KEY,
  "recent_scans",
  "@medimate_medications",
  "@medimate_reminders",
  "emergency_contacts",
  "medical_id",
] as const;

const USER_SCOPED_DATA_KEYS = [
  PROFILE_KEY,
  USER_EMAIL_KEY,
  USER_PHONE_KEY,
  USER_NAME_KEY,
  "recent_scans",
  "@medimate_medications",
  "@medimate_reminders",
  "emergency_contacts",
  "medical_id",
] as const;

export function getProfileStorageKey(): string {
  return getUserScopedKey(PROFILE_KEY);
}

export function getIdentityStorageKey(
  key: "user_email" | "user_phone" | "user_name",
): string {
  return getUserScopedKey(key);
}

export async function clearCurrentUserScopedData(): Promise<void> {
  for (const baseKey of USER_SCOPED_DATA_KEYS) {
    await AsyncStorage.removeItem(getUserScopedKey(baseKey));
  }
}

async function migrateLegacySharedDataToScopedKeys(): Promise<void> {
  const alreadyMigrated = await AsyncStorage.getItem(LEGACY_MIGRATION_FLAG_KEY);
  if (alreadyMigrated === "1") {
    return;
  }

  for (const baseKey of LEGACY_SHARED_KEYS) {
    const scopedKey = getUserScopedKey(baseKey);
    const scopedValue = await AsyncStorage.getItem(scopedKey);

    // Never override existing account-scoped data.
    if (scopedValue != null) {
      continue;
    }

    const legacyValue = await AsyncStorage.getItem(baseKey);
    if (legacyValue != null) {
      await AsyncStorage.setItem(scopedKey, legacyValue);
    }
  }

  // Mark as globally migrated so legacy shared keys are imported only once.
  await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, "1");

  // Remove legacy shared keys to prevent accidental reuse across accounts.
  for (const baseKey of LEGACY_SHARED_KEYS) {
    await AsyncStorage.removeItem(baseKey);
  }
}

interface SyncIdentityInput {
  fullName?: string | null;
  email?: string | null;
  contactNumber?: string | null;
}

interface SyncOptions {
  forceName?: boolean;
}

function splitName(fullName: string) {
  const cleaned = fullName.trim();
  if (!cleaned) {
    return { firstName: "", lastName: "" };
  }

  const parts = cleaned.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export async function syncIdentityToProfile(
  input: SyncIdentityInput,
  options: SyncOptions = {},
): Promise<Record<string, any>> {
  await migrateLegacySharedDataToScopedKeys();

  const profileKey = getProfileStorageKey();
  const existingRaw = await AsyncStorage.getItem(profileKey);
  const baseProfile: Record<string, any> = existingRaw
    ? JSON.parse(existingRaw)
    : {};

  const updates: Record<string, any> = {};

  const normalizedEmail = input.email?.trim() ?? "";
  const normalizedName = input.fullName?.trim() ?? "";
  const normalizedPhone = input.contactNumber?.trim() ?? "";

  if (normalizedEmail) {
    updates.email = normalizedEmail;
    await AsyncStorage.setItem(
      getIdentityStorageKey(USER_EMAIL_KEY),
      normalizedEmail,
    );
  }

  if (normalizedPhone) {
    updates.contactNumber = normalizedPhone;
    await AsyncStorage.setItem(
      getIdentityStorageKey(USER_PHONE_KEY),
      normalizedPhone,
    );
  }

  if (normalizedName) {
    const name = splitName(normalizedName);
    const hasCurrentName = !!baseProfile.firstName || !!baseProfile.lastName;

    if (options.forceName || !hasCurrentName) {
      updates.firstName = name.firstName;
      updates.lastName = name.lastName;
    }

    await AsyncStorage.setItem(
      getIdentityStorageKey(USER_NAME_KEY),
      normalizedName,
    );
  }

  const merged = {
    ...baseProfile,
    ...updates,
  };

  await AsyncStorage.setItem(profileKey, JSON.stringify(merged));
  return merged;
}
