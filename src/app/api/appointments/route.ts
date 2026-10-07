import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { PATIENTS_COLLECTION } from "@/lib/patients";
import { ethiopianToGregorian, formatEthiopianDate, parseEthiopianDateString } from "@/lib/ethiopian-calendar";
import { APPOINTMENT_PURPOSES, type Appointment } from "@/types/appointment";

const APPOINTMENTS_COLLECTION = "appointments";

const createSchema = z.object({
  patientCardNumber: z.coerce.number().int().positive(),
  doctorId: z.string().min(1),
  dateEthiopian: z.string().trim().min(8, "Date is required (dd/mm/yyyy)"),
  time: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm")
    .optional()
    .or(z.literal("")),
  purpose: z.enum(APPOINTMENT_PURPOSES),
  customPurpose: z.string().trim().max(200).optional(),
});

// POST /api/appointments — book an appointment
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN", "RECEPTIONIST", "DOCTOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Doctors can only book for themselves
  if (user.role === "DOCTOR" && input.doctorId !== user.uid) {
    return NextResponse.json({ error: "Doctors can only book their own appointments" }, { status: 403 });
  }
  if (input.purpose === "OTHER" && !input.customPurpose) {
    return NextResponse.json({ error: "Custom purpose is required when purpose is OTHER" }, { status: 400 });
  }

  const ed = parseEthiopianDateString(input.dateEthiopian);
  if (!ed) {
    return NextResponse.json({ error: "Invalid Ethiopian date — use dd/mm/yyyy" }, { status: 400 });
  }

  const db = adminDb();
  const [patientSnap, doctorSnap] = await Promise.all([
    db.collection(PATIENTS_COLLECTION).doc(String(input.patientCardNumber)).get(),
    db.doc(`users/${input.doctorId}`).get(),
  ]);

  const patient = patientSnap.data();
  if (!patient) {
    return NextResponse.json({ error: `Patient with card number ${input.patientCardNumber} not found` }, { status: 404 });
  }
  const doctor = doctorSnap.data();
  if (!doctor || doctor.role !== "DOCTOR" || doctor.isActive === false) {
    return NextResponse.json({ error: "Selected doctor is not available" }, { status: 400 });
  }

  // Doctor-patient assignment validation
  if (patient.assignedDoctorId && patient.assignedDoctorId !== input.doctorId) {
    const assignedSnap = await db.doc(`users/${patient.assignedDoctorId}`).get();
    const assignedName = assignedSnap.data()?.fullName ?? "another doctor";
    return NextResponse.json(
      { error: `This patient is assigned to ${assignedName}. Book with the assigned doctor.` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const ref = db.collection(APPOINTMENTS_COLLECTION).doc();
  const appointment: Appointment = {
    id: ref.id,
    patientCardNumber: input.patientCardNumber,
    patientName: patient.fullName,
    doctorId: input.doctorId,
    doctorName: doctor.fullName,
    dateEthiopian: formatEthiopianDate(ed),
    dateGregorian: ethiopianToGregorian(ed).toISOString(),
    time: input.time || null,
    purpose: input.purpose,
    customPurpose: input.purpose === "OTHER" ? input.customPurpose ?? null : null,
    status: "SCHEDULED",
    cancellationReason: null,
    completionNote: null,
    createdByUid: user.uid,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(ref, appointment);
  // First booking assigns the patient to this doctor
  if (!patient.assignedDoctorId) {
    batch.update(patientSnap.ref, { assignedDoctorId: input.doctorId, updatedAt: now });
  }
  await batch.commit();

  logActivity(db, {
    userId: user.uid,
    username: user.username,
    action: "APPOINTMENT_BOOKED",
    entityType: "appointment",
    entityId: ref.id,
    details: `${patient.fullName} with ${doctor.fullName} on ${appointment.dateEthiopian}`,
  });

  return NextResponse.json({ appointment }, { status: 201 });
}

// GET /api/appointments?status=SCHEDULED&doctorId=... — doctors see only their own
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "RECEPTIONIST", "DOCTOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const doctorId = user.role === "DOCTOR" ? user.uid : searchParams.get("doctorId");

  const db = adminDb();
  let query: FirebaseFirestore.Query = db.collection(APPOINTMENTS_COLLECTION);
  if (status) query = query.where("status", "==", status);
  if (doctorId) query = query.where("doctorId", "==", doctorId);

  // Equality-only filters avoid composite indexes; sort in memory
  const snap = await query.limit(300).get();
  const appointments = snap.docs
    .map((d) => d.data() as Appointment)
    .sort((a, b) => b.dateGregorian.localeCompare(a.dateGregorian));

  return NextResponse.json({ appointments });
}
