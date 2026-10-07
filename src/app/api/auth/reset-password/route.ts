import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/activity";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  username: z.string().trim().min(1),
  otp: z.string().trim().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/auth/reset-password — public; user redeems an admin-issued OTP
export async function POST(req: NextRequest) {
  if (!rateLimit(`reset:${clientIp(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts — try again later" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const db = adminDb();
  const username = parsed.data.username.toLowerCase();
  const userQuery = await db.collection("users").where("username", "==", username).limit(1).get();
  // Same error for unknown user / bad OTP to avoid username enumeration
  const invalid = NextResponse.json({ error: "Invalid username or OTP" }, { status: 400 });
  if (userQuery.empty) return invalid;

  const uid = userQuery.docs[0].id;
  const otpSnap = await db.doc(`otpResets/${uid}`).get();
  const otpData = otpSnap.data();
  if (!otpData || otpData.used || new Date(otpData.expiresAt) < new Date()) return invalid;

  const match = await bcrypt.compare(parsed.data.otp, otpData.otpHash);
  if (!match) return invalid;

  await db.doc(`otpResets/${uid}`).update({ used: true, usedAt: new Date().toISOString() });
  await adminAuth().updateUser(uid, { password: parsed.data.newPassword });
  await adminAuth().revokeRefreshTokens(uid);

  logActivity(db, {
    userId: uid,
    username,
    action: "PASSWORD_RESET",
    entityType: "user",
    entityId: uid,
  });

  return NextResponse.json({ ok: true });
}
