import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  allocateCardNumber,
  buildPatientDoc,
  normalizeGender,
  normalizePhone,
  PATIENTS_COLLECTION,
} from "@/lib/patients";
import {
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopian-calendar";

const createPatientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  age: z.coerce.number().int().min(0).max(150).nullable().optional(),
  gender: z.string().min(1, "Gender is required"),
  subcity: z.string().trim().max(100).optional(),
  address: z.string().trim().max(200).optional(),
  woreda: z.string().trim().max(100).optional(),
  phone: z.string().trim().min(7, "Phone number is required").max(20),
  emergencyPhone: z.string().trim().max(20).optional(),
});

// POST /api/patients — register a new patient (next sequential card number)
export async function POST(req: NextRequest) {
  const user = await requireRole(["ADMIN", "RECEPTIONIST"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const db = adminDb();
  const now = new Date();
  const todayEthiopian = formatEthiopianDate(gregorianToEthiopian(now));

  const gender = normalizeGender(parsed.data.gender);
  if (!gender) {
    return NextResponse.json({ error: "Gender must be Male or Female" }, { status: 400 });
  }

  // Auto-assign to the clinic's doctor when there is exactly one active doctor
  const doctorsSnap = await db
    .collection("users")
    .where("role", "==", "DOCTOR")
    .where("isActive", "==", true)
    .get();
  const autoDoctorId = doctorsSnap.size === 1 ? doctorsSnap.docs[0].id : null;

  const patient = await db.runTransaction(async (tx) => {
    const cardNumber = await allocateCardNumber(db, tx);
    const doc = buildPatientDoc({
      cardNumber,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      age: parsed.data.age ?? null,
      gender,
      phone: normalizePhone(parsed.data.phone),
      subcity: parsed.data.subcity || null,
      address: parsed.data.address || null,
      woreda: parsed.data.woreda || null,
      emergencyPhone: parsed.data.emergencyPhone ? normalizePhone(parsed.data.emergencyPhone) : null,
      registrationDateEthiopian: todayEthiopian,
      registrationDateGregorian: now.toISOString(),
      importedFromExcel: false,
      assignedDoctorId: autoDoctorId,
    });
    tx.set(db.collection(PATIENTS_COLLECTION).doc(String(cardNumber)), doc);
    return doc;
  });

  logActivity(db, {
    userId: user.uid,
    username: user.username,
    action: "PATIENT_REGISTERED",
    entityType: "patient",
    entityId: String(patient.cardNumber),
    details: patient.fullName,
  });

  return NextResponse.json({ patient }, { status: 201 });
}

// GET /api/patients?search=abe | ?page=2&limit=20 — keyword search or paginated list
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DOCTOR", "RECEPTIONIST"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

  const db = adminDb();

  if (search) {
    const snap = await db
      .collection(PATIENTS_COLLECTION)
      .where("searchKeywords", "array-contains", search)
      .limit(50)
      .get();
    const patients = snap.docs.map((d) => d.data());
    return NextResponse.json({ patients, total: patients.length, pageCount: 1, page: 1 });
  }

  const [snap, countSnap] = await Promise.all([
    db
      .collection(PATIENTS_COLLECTION)
      .orderBy("cardNumber", "desc")
      .offset((page - 1) * limit)
      .limit(limit)
      .get(),
    db.collection(PATIENTS_COLLECTION).count().get(),
  ]);

  const total = countSnap.data().count;
  return NextResponse.json({
    patients: snap.docs.map((d) => d.data()),
    total,
    pageCount: Math.max(1, Math.ceil(total / limit)),
    page,
  });
}
