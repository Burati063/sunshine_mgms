import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { usernameToEmail } from "@/lib/auth-shared";
import { logActivity } from "@/lib/activity";

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, . _ -"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(1).max(100),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTIONIST"]),
  specialization: z.string().trim().max(100).optional(),
});

// GET /api/users — admin: full list; other roles: doctors only (for booking dropdowns)
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DOCTOR", "RECEPTIONIST"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = adminDb();
  const roleFilter = req.nextUrl.searchParams.get("role");

  if (user.role !== "ADMIN" || roleFilter === "DOCTOR") {
    const snap = await db
      .collection("users")
      .where("role", "==", "DOCTOR")
      .where("isActive", "==", true)
      .get();
    const doctors = snap.docs.map((d) => {
      const { uid, fullName, specialization } = d.data();
      return { uid, fullName, specialization };
    });
    return NextResponse.json({ users: doctors });
  }

  const snap = await db.collection("users").get();
  const users = snap.docs
    .map((d) => d.data())
    .sort((a, b) => String(a.username).localeCompare(String(b.username)));
  return NextResponse.json({ users });
}

// POST /api/users — admin creates a user
export async function POST(req: NextRequest) {
  const admin = await requireRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const db = adminDb();
  const auth = adminAuth();
  const username = parsed.data.username.toLowerCase();

  const dup = await db.collection("users").where("username", "==", username).limit(1).get();
  if (!dup.empty) {
    return NextResponse.json({ error: `Username "${username}" is already taken` }, { status: 409 });
  }

  const created = await auth.createUser({
    email: usernameToEmail(username),
    password: parsed.data.password,
    displayName: parsed.data.fullName,
  });
  await auth.setCustomUserClaims(created.uid, { role: parsed.data.role });

  const now = new Date().toISOString();
  const profile = {
    uid: created.uid,
    username,
    fullName: parsed.data.fullName,
    role: parsed.data.role,
    specialization: parsed.data.role === "DOCTOR" ? parsed.data.specialization ?? null : null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.doc(`users/${created.uid}`).set(profile);

  logActivity(db, {
    userId: admin.uid,
    username: admin.username,
    action: "USER_CREATED",
    entityType: "user",
    entityId: created.uid,
    details: `${username} (${parsed.data.role})`,
  });

  return NextResponse.json({ user: profile }, { status: 201 });
}
