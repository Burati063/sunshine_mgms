import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { PATIENTS_COLLECTION } from "@/lib/patients";
import { csvResponse, toCsv } from "@/lib/csv";

// GET /api/patients/export — CSV of all patients
export async function GET() {
  const user = await requireRole(["ADMIN", "RECEPTIONIST"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb().collection(PATIENTS_COLLECTION).get();
  const rows = snap.docs
    .map((d) => d.data())
    .sort((a, b) => (a.cardNumber as number) - (b.cardNumber as number));

  const csv = toCsv(rows, [
    { key: "cardNumber", header: "Card Number" },
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "age", header: "Age" },
    { key: "gender", header: "Gender" },
    { key: "phone", header: "Phone" },
    { key: "emergencyPhone", header: "Emergency Phone" },
    { key: "subcity", header: "Subcity" },
    { key: "woreda", header: "Woreda" },
    { key: "address", header: "Address" },
    { key: "registrationDateEthiopian", header: "Registration Date (EC)" },
    { key: "importedFromExcel", header: "Imported" },
  ]);

  return csvResponse(csv, `patients-${new Date().toISOString().slice(0, 10)}.csv`);
}
