import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  fullName: z.string().trim().min(1).max(100).optional(),
  specialization: z.string().trim().max(100).nullable().optional(),
});

// PATCH /api/users/[uid] — admin updates profile / activation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const admin = await requireRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { uid } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (uid === admin.uid && parsed.data.isActive === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.specialization !== undefined) updates.specialization = parsed.data.specialization;

  await ref.update(updates);
  if (parsed.data.isActive !== undefined) {
    // Also disable at the Auth level so existing tokens stop working
    await adminAuth().updateUser(uid, { disabled: !parsed.data.isActive });
    if (!parsed.data.isActive) await adminAuth().revokeRefreshTokens(uid);
  }

  logActivity(db, {
    userId: admin.uid,
    username: admin.username,
    action: "USER_UPDATED",
    entityType: "user",
    entityId: uid,
    details: JSON.stringify(parsed.data),
  });

  const updated = await ref.get();
  return NextResponse.json({ user: updated.data() });
}
