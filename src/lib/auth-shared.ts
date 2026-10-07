// Client-safe auth helpers (no firebase-admin imports)

/** Usernames are mapped to synthetic emails for Firebase Auth. */
export const AUTH_EMAIL_DOMAIN = "sunshine.clinic";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}
