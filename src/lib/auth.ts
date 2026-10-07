import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Role } from "@/types/user";

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionUser {
  uid: string;
  username: string;
  fullName: string;
  role: Role;
}

/**
 * Verifies the session cookie and loads the user profile. Returns null when unauthenticated.
 * Wrapped in React cache() so layout + page + APIs in one request share a single verification.
 * Revocation is NOT checked per-request (saves a network roundtrip); the cookie
 * signature check is local and the cookie expires after 8h anyway.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(session);
    const snap = await adminDb().doc(`users/${decoded.uid}`).get();
    const data = snap.data();
    if (!data || data.isActive === false) return null;
    return {
      uid: decoded.uid,
      username: data.username,
      fullName: data.fullName,
      role: data.role,
    };
  } catch {
    return null;
  }
});

/** For API routes: returns the user, or null when not authenticated / not in `roles`. */
export async function requireRole(roles?: Role[]): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}
