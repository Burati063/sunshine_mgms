"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateTimeEC } from "@/lib/ethiopian-calendar";
import type { Patient } from "@/types/patient";
import type { Appointment } from "@/types/appointment";
import type { MedicalRecord } from "@/types/medical-record";

interface Doctor {
  uid: string;
  fullName: string;
  specialization: string | null;
}

export default function PatientDetailClient({
  patient,
  appointments,
  records,
  doctors,
  assignedDoctorName,
  canEdit,
  canReassign,
}: {
  patient: Patient;
  appointments: Appointment[];
  records: MedicalRecord[];
  doctors: Doctor[];
  assignedDoctorName: string | null;
  canEdit: boolean;
  canReassign: boolean;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [expandedAppt, setExpandedAppt] = useState<string | null>(null);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  return (
    <div>
      <Link href="/dashboard/patients" className="text-sm text-amber-600 hover:underline">
        ← Back to patients
      </Link>

      <div className="mt-3 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {patient.fullName}{" "}
              <span className="text-lg font-semibold text-amber-600">#{patient.cardNumber}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Registered {patient.registrationDateEthiopian ?? "—"} (EC) ·{" "}
              {patient.importedFromExcel ? "Imported from Excel" : "Registered in system"}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Edit
            </button>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <InfoField label="Age" value={patient.age != null ? String(patient.age) : "—"} />
          <InfoField label="Gender" value={patient.gender ?? "—"} />
          <InfoField label="Phone" value={patient.phone || "—"} />
          <InfoField label="Emergency phone" value={patient.emergencyPhone ?? "—"} />
          <InfoField label="Subcity" value={patient.subcity ?? "—"} />
          <InfoField label="Woreda" value={patient.woreda ?? "—"} />
          <InfoField label="Address" value={patient.address ?? "—"} />
          <InfoField label="Assigned doctor" value={assignedDoctorName ? `Dr. ${assignedDoctorName}` : "Not assigned"} />
        </dl>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Appointments ({appointments.length})</h2>
          <div className="mt-2 divide-y rounded-lg border bg-white shadow-sm">
            {appointments.map((a) => (
              <div key={a.id}>
                <button
                  onClick={() => setExpandedAppt(expandedAppt === a.id ? null : a.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-amber-50/40"
                >
                  <span className="font-medium">
                    {a.dateEthiopian} {a.time ?? ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <span className="text-gray-400">{expandedAppt === a.id ? "▲" : "▼"}</span>
                  </span>
                </button>
                {expandedAppt === a.id && (
                  <div className="border-t bg-gray-50/60 px-4 py-3 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Doctor:</span> Dr. {a.doctorName}
                    </p>
                    <p>
                      <span className="font-medium">Purpose:</span>{" "}
                      {a.purpose === "OTHER" ? a.customPurpose : a.purpose}
                    </p>
                    {a.cancellationReason && (
                      <p>
                        <span className="font-medium">Cancellation reason:</span> {a.cancellationReason}
                      </p>
                    )}
                    {a.completionNote && (
                      <p>
                        <span className="font-medium">Completion comment:</span> {a.completionNote}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Booked {formatDateTimeEC(a.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {appointments.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No appointments yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Medical history ({records.length})</h2>
          <div className="mt-2 divide-y rounded-lg border bg-white shadow-sm">
            {records.map((r) => (
              <div key={r.id}>
                <button
                  onClick={() => setExpandedVisit(expandedVisit === r.id ? null : r.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-amber-50/40"
                >
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Visit #{r.visitNumber}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    {r.dateEthiopian} · Dr. {r.doctorName}
                    <span className="text-gray-400">{expandedVisit === r.id ? "▲" : "▼"}</span>
                  </span>
                </button>
                {expandedVisit === r.id && (
                  <div className="border-t bg-gray-50/60 px-4 py-3 text-sm">
                    <p>
                      <span className="font-medium">Diagnosis:</span> {r.diagnosis}
                    </p>
                    {r.treatment && (
                      <p className="text-gray-600">
                        <span className="font-medium">Treatment:</span> {r.treatment}
                      </p>
                    )}
                    {r.prescription && (
                      <p className="text-gray-600">
                        <span className="font-medium">Prescription:</span> {r.prescription}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-gray-600">
                        <span className="font-medium">Notes:</span> {r.notes}
                      </p>
                    )}
                    {r.nextAppointmentEthiopian && (
                      <p className="text-gray-600">
                        <span className="font-medium">Next appointment (EC):</span>{" "}
                        {r.nextAppointmentEthiopian}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {records.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No medical records yet.</p>
            )}
          </div>
        </section>
      </div>

      {showEdit && (
        <EditPatientDialog
          patient={patient}
          doctors={doctors}
          canReassign={canReassign}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function EditPatientDialog({
  patient,
  doctors,
  canReassign,
  onClose,
}: {
  patient: Patient;
  doctors: Doctor[];
  canReassign: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      age: form.get("age") ? Number(form.get("age")) : null,
      gender: String(form.get("gender") ?? "") || null,
      subcity: String(form.get("subcity") ?? "") || null,
      address: String(form.get("address") ?? "") || null,
      woreda: String(form.get("woreda") ?? "") || null,
      phone: String(form.get("phone") ?? ""),
      emergencyPhone: String(form.get("emergencyPhone") ?? "") || null,
    };
    if (canReassign) {
      payload.assignedDoctorId = String(form.get("assignedDoctorId") ?? "") || null;
    }

    const res = await fetch(`/api/patients/${patient.cardNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      const issues = data?.issues
        ? Object.values(data.issues).flat().join(", ")
        : data?.error ?? "Update failed";
      toast.error(String(issues));
      return;
    }
    toast.success("Patient updated");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">
          Edit Patient <span className="text-amber-600">#{patient.cardNumber}</span>
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">First name *</label>
              <input name="firstName" required defaultValue={patient.firstName} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Last name *</label>
              <input name="lastName" required defaultValue={patient.lastName} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Age</label>
              <input name="age" type="number" min={0} max={150} defaultValue={patient.age ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Gender *</label>
              <select name="gender" required defaultValue={patient.gender ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="" disabled>
                  Select gender...
                </option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone *</label>
            <input name="phone" required defaultValue={patient.phone} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Subcity</label>
              <input name="subcity" defaultValue={patient.subcity ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Woreda</label>
              <input name="woreda" defaultValue={patient.woreda ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input name="address" defaultValue={patient.address ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Emergency contact phone</label>
            <input name="emergencyPhone" defaultValue={patient.emergencyPhone ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          {canReassign && (
            <div>
              <label className="block text-sm font-medium">Assigned doctor</label>
              <select
                name="assignedDoctorId"
                defaultValue={patient.assignedDoctorId ?? ""}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Not assigned</option>
                {doctors.map((d) => (
                  <option key={d.uid} value={d.uid}>
                    Dr. {d.fullName}
                    {d.specialization ? ` — ${d.specialization}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
