import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { PATIENTS_COLLECTION } from "@/lib/patients";
import {
  ethiopianToGregorian,
  formatEthiopianDate,
  gregorianToEthiopian,
  parseEthiopianDateString,
} from "@/lib/ethiopian-calendar";
import type { MedicalRecord } from "@/types/medical-record";
import type { Appointment } from "@/types/appointment";

const RECORDS_COLLECTION = "medicalRecords";

const createSchema = z.object({
  patientCardNumber: z.coerce.number().int().positive(),
  diagnosis: z.string().trim().min(1, "Diagnosis is required").max(2000),
  treatment: z.string().trim().max(2000).optional(),
  prescription: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAppointmentEthiopian: z.string().trim().optional(),
});

// POST /api/records — doctors only, for their assigned patients
export async function POST(req: NextRequest) {
  const user = await requireRole(["DOCTOR"]);
  if (!user) {
    return NextResponse.json({ error: "Only doctors can create medical records" }, { status: 403 });
  }

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

  let nextAppointment: string | null = null;
  let nextAppointmentGregorian: string | null = null;
  if (input.nextAppointmentEthiopian) {
    const ed = parseEthiopianDateString(input.nextAppointmentEthiopian);
    if (!ed) {
      return NextResponse.json({ error: "Invalid next-appointment date — use dd/mm/yyyy (EC)" }, { status: 400 });
    }
    nextAppointment = formatEthiopianDate(ed);
    nextAppointmentGregorian = ethiopianToGregorian(ed).toISOString();
  }

  const db = adminDb();
  const patientRef = db.collection(PATIENTS_COLLECTION).doc(String(input.patientCardNumber));

  const record = await db.runTransaction(async (tx) => {
    const patientSnap = await tx.get(patientRef);
    const patient = patientSnap.data();
    if (!patient) {
      throw new ApiError(404, `Patient with card number ${input.patientCardNumber} not found`);
    }
    if (patient.assignedDoctorId && patient.assignedDoctorId !== user.uid) {
      throw new ApiError(403, "This patient is assigned to another doctor");
    }

    const now = new Date();
    const todayEC = formatEthiopianDate(gregorianToEthiopian(now));

    // Patient showed up — read today's scheduled appointments before any writes
    const dueApptsSnap = await tx.get(
      db
        .collection("appointments")
        .where("patientCardNumber", "==", input.patientCardNumber)
        .where("doctorId", "==", user.uid)
        .where("status", "==", "SCHEDULED")
        .where("dateEthiopian", "==", todayEC)
    );

    const visitNumber = ((patient.recordsCount as number | undefined) ?? 0) + 1;
    const ref = db.collection(RECORDS_COLLECTION).doc();
    const doc: MedicalRecord = {
      id: ref.id,
      patientCardNumber: input.patientCardNumber,
      patientName: patient.fullName,
      doctorId: user.uid,
      doctorName: user.fullName,
      visitNumber,
      diagnosis: input.diagnosis,
      treatment: input.treatment || null,
      prescription: input.prescription || null,
      notes: input.notes || null,
      nextAppointmentEthiopian: nextAppointment,
      dateEthiopian: todayEC,
      dateGregorian: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    tx.set(ref, doc);
    tx.update(patientRef, {
      recordsCount: visitNumber,
      assignedDoctorId: patient.assignedDoctorId ?? user.uid,
      updatedAt: now.toISOString(),
    });

    // Today's scheduled appointment auto-completes once the visit is documented
    dueApptsSnap.docs.forEach((d) => {
      tx.update(d.ref, {
        status: "COMPLETED",
        completionNote: `Auto-completed — visit #${visitNumber} documented`,
        updatedAt: now.toISOString(),
      });
    });

    // Next appointment on a record automatically books a follow-up visit
    if (nextAppointment && nextAppointmentGregorian) {
      const apptRef = db.collection("appointments").doc();
      const followUp: Appointment = {
        id: apptRef.id,
        patientCardNumber: input.patientCardNumber,
        patientName: patient.fullName,
        doctorId: user.uid,
        doctorName: user.fullName,
        dateEthiopian: nextAppointment,
        dateGregorian: nextAppointmentGregorian,
        time: null,
        purpose: "OTHER",
        customPurpose: `Follow-up (visit #${visitNumber})`,
        status: "SCHEDULED",
        cancellationReason: null,
        completionNote: null,
        createdByUid: user.uid,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      tx.set(apptRef, followUp);
    }
    return doc;
  }).catch((err) => {
    if (err instanceof ApiError) return err;
    throw err;
  });

  if (record instanceof ApiError) {
    return NextResponse.json({ error: record.message }, { status: record.status });
  }

  logActivity(db, {
    userId: user.uid,
    username: user.username,
    action: "RECORD_CREATED",
    entityType: "medicalRecord",
    entityId: record.id,
    details: `${record.patientName} — visit #${record.visitNumber}${nextAppointment ? ` · follow-up booked ${nextAppointment}` : ""}`,
  });

  return NextResponse.json({ record }, { status: 201 });
}

// GET /api/records?patient=123 — history for one patient, or recent records
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DOCTOR", "RECEPTIONIST"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = adminDb();
  const patientParam = req.nextUrl.searchParams.get("patient");

  let query: FirebaseFirestore.Query = db.collection(RECORDS_COLLECTION);
  if (patientParam) {
    const cardNumber = Number(patientParam);
    if (!Number.isInteger(cardNumber) || cardNumber < 1) {
      return NextResponse.json({ error: "Invalid patient card number" }, { status: 400 });
    }
    // Doctors may only view records of their own patients
    if (user.role === "DOCTOR") {
      const patientSnap = await db.collection(PATIENTS_COLLECTION).doc(String(cardNumber)).get();
      const assigned = patientSnap.data()?.assignedDoctorId;
      if (assigned && assigned !== user.uid) {
        return NextResponse.json({ error: "This patient is assigned to another doctor" }, { status: 403 });
      }
    }
    query = query.where("patientCardNumber", "==", cardNumber);
  } else if (user.role === "DOCTOR") {
    query = query.where("doctorId", "==", user.uid);
  }

  const snap = await query.limit(300).get();
  const records = snap.docs
    .map((d) => d.data() as MedicalRecord)
    .sort((a, b) => b.dateGregorian.localeCompare(a.dateGregorian));

  return NextResponse.json({ records });
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
