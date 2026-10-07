import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const OTP_TTL_MS = 15 * 60 * 1000;

// POST /api/users/[uid]/otp — admin generates a one-time password-reset code
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const admin = await requireRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { uid } = await params;
  const db = adminDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);

  await db.doc(`otpResets/${uid}`).set({
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    used: false,
    createdBy: admin.uid,
    createdAt: new Date().toISOString(),
  });

  logActivity(db, {
    userId: admin.uid,
    username: admin.username,
    action: "OTP_GENERATED",
    entityType: "user",
    entityId: uid,
  });

  // Shown once to the admin, who relays it to the user
  return NextResponse.json({ otp, expiresInMinutes: OTP_TTL_MS / 60000 });
}
