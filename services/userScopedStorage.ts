import { getCurrentUser } from "./authFacade";

export function getUserScopedKey(baseKey: string): string {
  const uid = getCurrentUser()?.uid ?? "guest";
  return `${baseKey}:${uid}`;
}
