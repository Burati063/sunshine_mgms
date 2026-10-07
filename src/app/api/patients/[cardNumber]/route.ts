import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  buildSearchKeywords,
  normalizeGender,
  normalizePhone,
  PATIENTS_COLLECTION,
} from "@/lib/patients";

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  age: z.coerce.number().int().min(0).max(150).nullable().optional(),
  gender: z.string().nullable().optional(),
  subcity: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  woreda: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  emergencyPhone: z.string().trim().max(20).nullable().optional(),
  assignedDoctorId: z.string().nullable().optional(),
});

// PATCH /api/patients/[cardNumber] — edit patient info; doctors only their assigned patients; doctor reassignment is admin-only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cardNumber: string }> }
) {
  const user = await requireRole(["ADMIN", "RECEPTIONIST", "DOCTOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardNumber } = await params;
  if (!/^\d+$/.test(cardNumber)) {
    return NextResponse.json({ error: "Invalid card number" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  if (parsed.data.assignedDoctorId !== undefined && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can reassign the doctor" }, { status: 403 });
  }

  const db = adminDb();
  const ref = db.collection(PATIENTS_COLLECTION).doc(cardNumber);
  const snap = await ref.get();
  const patient = snap.data();
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  if (user.role === "DOCTOR" && patient.assignedDoctorId !== user.uid) {
    return NextResponse.json({ error: "You can only edit patients assigned to you" }, { status: 403 });
  }

  if (parsed.data.assignedDoctorId) {
    const doctorSnap = await db.doc(`users/${parsed.data.assignedDoctorId}`).get();
    const doctor = doctorSnap.data();
    if (!doctor || doctor.role !== "DOCTOR" || doctor.isActive === false) {
      return NextResponse.json({ error: "Selected doctor is not available" }, { status: 400 });
    }
  }

  const firstName = parsed.data.firstName ?? patient.firstName;
  const lastName = parsed.data.lastName ?? patient.lastName;
  const phone = parsed.data.phone !== undefined ? normalizePhone(parsed.data.phone) : patient.phone;

  const updates: Record<string, unknown> = {
    firstName,
    lastName,
    phone,
    fullName: `${firstName} ${lastName}`.trim(),
    searchKeywords: buildSearchKeywords({
      firstName,
      lastName,
      phone,
      cardNumber: patient.cardNumber,
    }),
    updatedAt: new Date().toISOString(),
  };
  if (parsed.data.age !== undefined) updates.age = parsed.data.age;
  if (parsed.data.gender !== undefined) updates.gender = normalizeGender(parsed.data.gender);
  if (parsed.data.subcity !== undefined) updates.subcity = parsed.data.subcity || null;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address || null;
  if (parsed.data.woreda !== undefined) updates.woreda = parsed.data.woreda || null;
  if (parsed.data.emergencyPhone !== undefined)
    updates.emergencyPhone = parsed.data.emergencyPhone ? normalizePhone(parsed.data.emergencyPhone) : null;
  if (parsed.data.assignedDoctorId !== undefined) updates.assignedDoctorId = parsed.data.assignedDoctorId;

  await ref.update(updates);

  logActivity(db, {
    userId: user.uid,
    username: user.username,
    action: "PATIENT_UPDATED",
    entityType: "patient",
    entityId: cardNumber,
    details: `${firstName} ${lastName}`,
  });

  const updated = await ref.get();
  return NextResponse.json({ patient: updated.data() });
}
