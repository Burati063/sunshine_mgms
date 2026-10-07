"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import EthiopianDatePicker from "@/components/ethiopian-date-picker";
import Pagination from "@/components/pagination";
import { formatDateTimeEC } from "@/lib/ethiopian-calendar";
import type { Appointment } from "@/types/appointment";
import type { Role } from "@/types/user";
import type { Patient } from "@/types/patient";

interface Doctor {
  uid: string;
  fullName: string;
  specialization: string | null;
}

const PURPOSE_LABELS: Record<string, string> = {
  CHECKUP: "Checkup",
  CLEANING: "Cleaning",
  FILLING: "Filling",
  EXTRACTION: "Extraction",
  ROOT_CANAL: "Root Canal",
  ORTHODONTICS: "Orthodontics",
  OTHER: "Other",
};

const PAGE_SIZE = 15;

export default function AppointmentsClient({
  role,
  currentUid,
  todayEthiopian,
}: {
  role: Role;
  currentUid: string;
  todayEthiopian: string;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("SCHEDULED");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Appointment | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/appointments?${params}`);
    if (!res.ok) {
      toast.error("Failed to load appointments");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAppointments(data.appointments);
    setPage(1);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          + Book Appointment
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {["SCHEDULED", "COMPLETED", "CANCELLED", ""].map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === s
                ? "bg-amber-600 text-white"
                : "border bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date (EC)</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Card #</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5">{a.dateEthiopian}</td>
                <td className="px-4 py-2.5">{a.time ?? "—"}</td>
                <td className="px-4 py-2.5">{a.patientName}</td>
                <td className="px-4 py-2.5 font-semibold text-amber-700">{a.patientCardNumber}</td>
                <td className="px-4 py-2.5">{a.doctorName}</td>
                <td className="px-4 py-2.5" title={a.customPurpose ?? undefined}>
                  {a.purpose === "OTHER" ? a.customPurpose : PURPOSE_LABELS[a.purpose]}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={a.status} reason={a.cancellationReason} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailTarget(a)}
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      View detail
                    </button>
                    {a.status === "SCHEDULED" &&
                      (role !== "DOCTOR" || a.doctorId === currentUid) && (
                        <>
                          <button
                            onClick={() => setCompleteTarget(a)}
                            className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => setCancelTarget(a)}
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && appointments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(appointments.length / PAGE_SIZE))}
        onPageChange={setPage}
      />
      {loading && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

      {showForm && (
        <BookDialog
          role={role}
          currentUid={currentUid}
          todayEthiopian={todayEthiopian}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {cancelTarget && (
        <CancelDialog
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => {
            setCancelTarget(null);
            load();
          }}
        />
      )}

      {detailTarget && (
        <DetailDialog appointment={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

      {completeTarget && (
        <CompleteDialog
          appointment={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onCompleted={() => {
            setCompleteTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status, reason }: { status: string; reason: string | null }) {  const styles: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span
      title={reason ?? undefined}
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function BookDialog({
  role,
  currentUid,
  todayEthiopian,
  onClose,
  onCreated,
}: {
  role: Role;
  currentUid: string;
  todayEthiopian: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [purpose, setPurpose] = useState("CHECKUP");
  const [dateEC, setDateEC] = useState(todayEthiopian);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users?role=DOCTOR")
      .then((r) => r.json())
      .then((d) => setDoctors(d.users ?? []))
      .catch(() => toast.error("Failed to load doctors"));
  }, []);

  useEffect(() => {
    if (!patientSearch.trim() || selectedPatient) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch.trim())}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setPatientResults(data.patients);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, selectedPatient]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Select a patient first");
      return;
    }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientCardNumber: selectedPatient.cardNumber,
        doctorId: role === "DOCTOR" ? currentUid : String(form.get("doctorId") ?? ""),
        dateEthiopian: dateEC,
        time: String(form.get("time") ?? ""),
        purpose,
        customPurpose: String(form.get("customPurpose") ?? "") || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      const issues = data?.issues
        ? Object.values(data.issues).flat().join(", ")
        : data?.error ?? "Booking failed";
      toast.error(String(issues));
      return;
    }
    toast.success("Appointment booked");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Book Appointment</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="relative">
            <label className="block text-sm font-medium">Patient *</label>
            {selectedPatient ? (
              <div className="mt-1 flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2 text-sm">
                <span>
                  <span className="font-semibold text-amber-700">#{selectedPatient.cardNumber}</span>{" "}
                  {selectedPatient.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch("");
                  }}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  change
                </button>
              </div>
            ) : (
              <>
                <input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search name, phone or card number..."
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
                {patientResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                    {patientResults.map((p) => (
                      <li key={p.cardNumber}>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50"
                        >
                          <span className="font-semibold text-amber-700">#{p.cardNumber}</span>{" "}
                          {p.fullName} <span className="text-gray-400">{p.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {role !== "DOCTOR" && (
            <div>
              <label className="block text-sm font-medium">Doctor *</label>
              <select name="doctorId" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d.uid} value={d.uid}>
                    Dr. {d.fullName}
                    {d.specialization ? ` — ${d.specialization}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Date (EC) *</label>
              <div className="mt-1">
                <EthiopianDatePicker value={dateEC} onChange={setDateEC} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Time</label>
              <input name="time" type="time" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Purpose *</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {purpose === "OTHER" && (
            <div>
              <label className="block text-sm font-medium">Custom purpose *</label>
              <input name="customPurpose" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
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
              {saving ? "Booking..." : "Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CancelDialog({
  appointment,
  onClose,
  onCancelled,
}: {
  appointment: Appointment;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: String(form.get("reason") ?? "") }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(data?.error ?? "Cancel failed");
      return;
    }
    toast.success("Appointment cancelled");
    onCancelled();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Cancel Appointment</h2>
        <p className="mt-1 text-sm text-gray-500">
          {appointment.patientName} — {appointment.dateEthiopian}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Reason *</label>
            <textarea name="reason" required rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? "Cancelling..." : "Cancel appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {  const a = appointment;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Appointment Detail</h2>
          <StatusBadge status={a.status} reason={a.cancellationReason} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <DetailField label="Patient" value={a.patientName} />
          <DetailField label="Card number" value={`#${a.patientCardNumber}`} />
          <DetailField label="Doctor" value={`Dr. ${a.doctorName}`} />
          <DetailField label="Date (EC)" value={a.dateEthiopian} />
          <DetailField label="Time" value={a.time ?? "—"} />
          <DetailField
            label="Purpose"
            value={a.purpose === "OTHER" ? a.customPurpose ?? "Other" : PURPOSE_LABELS[a.purpose]}
          />
          {a.cancellationReason && (
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase text-gray-400">Cancellation reason</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{a.cancellationReason}</dd>
            </div>
          )}
          {a.completionNote && (
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase text-gray-400">Completion comment</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{a.completionNote}</dd>
            </div>
          )}
          <DetailField label="Booked" value={formatDateTimeEC(a.createdAt)} />
        </dl>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function CompleteDialog({
  appointment,
  onClose,
  onCompleted,
}: {
  appointment: Appointment;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const comment = String(form.get("comment") ?? "").trim();
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", ...(comment ? { comment } : {}) }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(data?.error ?? "Failed to complete");
      return;
    }
    toast.success("Appointment completed");
    onCompleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Complete Appointment</h2>
        <p className="mt-1 text-sm text-gray-500">
          {appointment.patientName} — {appointment.dateEthiopian}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Comment (optional)</label>
            <textarea
              name="comment"
              rows={3}
              maxLength={500}
              placeholder="e.g. Cleaning done, no issues found"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">
              Saved with the appointment and visible in the patient&apos;s history.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Completing..." : "Mark completed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
