import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { PATIENTS_COLLECTION } from "@/lib/patients";
import type { Patient } from "@/types/patient";
import type { Appointment } from "@/types/appointment";
import type { MedicalRecord } from "@/types/medical-record";
import PatientDetailClient from "@/components/patients/patient-detail-client";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ cardNumber: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { cardNumber } = await params;
  if (!/^\d+$/.test(cardNumber)) notFound();

  const db = adminDb();
  const snap = await db.collection(PATIENTS_COLLECTION).doc(cardNumber).get();
  const patient = snap.data() as Patient | undefined;
  if (!patient) notFound();

  // Doctors may only open their own (or unassigned) patients
  if (
    user.role === "DOCTOR" &&
    patient.assignedDoctorId &&
    patient.assignedDoctorId !== user.uid
  ) {
    redirect("/dashboard/patients");
  }

  const [apptsSnap, recordsSnap, doctorsSnap] = await Promise.all([
    db.collection("appointments").where("patientCardNumber", "==", patient.cardNumber).get(),
    db.collection("medicalRecords").where("patientCardNumber", "==", patient.cardNumber).get(),
    db.collection("users").where("role", "==", "DOCTOR").where("isActive", "==", true).get(),
  ]);

  const appointments = apptsSnap.docs
    .map((d) => d.data() as Appointment)
    .sort((a, b) => b.dateGregorian.localeCompare(a.dateGregorian));
  const records = recordsSnap.docs
    .map((d) => d.data() as MedicalRecord)
    .sort((a, b) => b.visitNumber - a.visitNumber);
  const doctors = doctorsSnap.docs.map((d) => {
    const { uid, fullName, specialization } = d.data();
    return { uid, fullName, specialization: specialization ?? null };
  });

  const assignedDoctor = doctors.find((d) => d.uid === patient.assignedDoctorId)?.fullName ?? null;

  return (
    <PatientDetailClient
      patient={patient}
      appointments={appointments}
      records={records}
      doctors={doctors}
      assignedDoctorName={assignedDoctor}
      canEdit={
        user.role === "ADMIN" ||
        user.role === "RECEPTIONIST" ||
        (user.role === "DOCTOR" && patient.assignedDoctorId === user.uid)
      }
      canReassign={user.role === "ADMIN"}
    />
  );
}
