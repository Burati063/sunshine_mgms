import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

// GET /api/records/export?patient=123 — CSV of medical records
export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN", "DOCTOR", "RECEPTIONIST"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = adminDb();
  const patientParam = req.nextUrl.searchParams.get("patient");

  let query: FirebaseFirestore.Query = db.collection("medicalRecords");
  if (patientParam) {
    const cardNumber = Number(patientParam);
    if (!Number.isInteger(cardNumber) || cardNumber < 1) {
      return NextResponse.json({ error: "Invalid patient card number" }, { status: 400 });
    }
    query = query.where("patientCardNumber", "==", cardNumber);
  }
  // Doctors export only their own records
  if (user.role === "DOCTOR") {
    query = patientParam ? query : query.where("doctorId", "==", user.uid);
  }

  const snap = await query.get();
  let rows = snap.docs.map((d) => d.data());
  if (user.role === "DOCTOR") {
    rows = rows.filter((r) => r.doctorId === user.uid);
  }
  rows.sort((a, b) => String(b.dateGregorian).localeCompare(String(a.dateGregorian)));

  const csv = toCsv(rows, [
    { key: "patientCardNumber", header: "Card Number" },
    { key: "patientName", header: "Patient" },
    { key: "visitNumber", header: "Visit #" },
    { key: "dateEthiopian", header: "Date (EC)" },
    { key: "doctorName", header: "Doctor" },
    { key: "diagnosis", header: "Diagnosis" },
    { key: "treatment", header: "Treatment" },
    { key: "prescription", header: "Prescription" },
    { key: "notes", header: "Notes" },
    { key: "nextAppointmentEthiopian", header: "Next Appointment (EC)" },
  ]);

  const suffix = patientParam ? `patient-${patientParam}` : "all";
  return csvResponse(csv, `records-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`);
}
