import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_DURATION_MS } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ idToken: z.string().min(1) });

// POST /api/auth/login — exchanges a Firebase ID token for an 8h httpOnly session cookie
export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many login attempts — try again in a minute" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  try {
    const auth = adminAuth();
    const db = adminDb();
    const decoded = await auth.verifyIdToken(parsed.data.idToken);

    const snap = await db.doc(`users/${decoded.uid}`).get();
    const profile = snap.data();
    if (!profile || profile.isActive === false) {
      return NextResponse.json(
        { error: "Account is disabled or not provisioned. Contact the administrator." },
        { status: 403 }
      );
    }

    const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    logActivity(db, {
      userId: decoded.uid,
      username: profile.username,
      action: "LOGIN",
      entityType: "user",
      entityId: decoded.uid,
    });

    const res = NextResponse.json({ ok: true, role: profile.role });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired credentials" }, { status: 401 });
  }
}
