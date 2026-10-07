"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import EthiopianDatePicker from "@/components/ethiopian-date-picker";
import Pagination from "@/components/pagination";
import type { MedicalRecord } from "@/types/medical-record";
import type { Patient } from "@/types/patient";
import type { Role } from "@/types/user";

const PAGE_SIZE = 10;

interface PatientGroup {
  cardNumber: number;
  patientName: string;
  visits: MedicalRecord[];
}

export default function RecordsClient({ role }: { role: Role }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [openGroup, setOpenGroup] = useState<PatientGroup | null>(null);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (patient: Patient | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (patient) params.set("patient", String(patient.cardNumber));
    const res = await fetch(`/api/records?${params}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Failed to load records");
      setRecords([]);
      setLoading(false);
      return;
    }
    setRecords(data.records);
    setExpandedVisit(null);
    setOpenGroup(null);
    setPage(1);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(selectedPatient);
  }, [selectedPatient, load]);

  // Merge records by card number — one row per patient
  const groups = useMemo<PatientGroup[]>(() => {
    const map = new Map<number, PatientGroup>();
    for (const r of records) {
      const g = map.get(r.patientCardNumber) ?? {
        cardNumber: r.patientCardNumber,
        patientName: r.patientName,
        visits: [],
      };
      g.visits.push(r);
      map.set(r.patientCardNumber, g);
    }
    const list = [...map.values()];
    list.forEach((g) => g.visits.sort((a, b) => a.visitNumber - b.visitNumber));
    return list.sort((a, b) => b.cardNumber - a.cardNumber);
  }, [records]);

  // When a patient is picked via search, jump straight to their visit list
  const activeGroup =
    openGroup ?? (selectedPatient ? groups.find((g) => g.cardNumber === selectedPatient.cardNumber) ?? null : null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Medical Records</h1>
        <div className="flex gap-2">
          <a
            href={
              activeGroup
                ? `/api/records/export?patient=${activeGroup.cardNumber}`
                : "/api/records/export"
            }
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Export CSV
          </a>
          {role === "DOCTOR" && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              + New Record
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 max-w-md">
        <PatientPicker selected={selectedPatient} onSelect={setSelectedPatient} />
      </div>

      {activeGroup ? (
        <div className="mt-4">
          {!selectedPatient && (
            <button
              onClick={() => {
                setOpenGroup(null);
                setExpandedVisit(null);
              }}
              className="text-sm text-amber-600 hover:underline"
            >
              ← Back to patient list
            </button>
          )}

          <div className="mt-2 rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">
              <span className="text-amber-600">#{activeGroup.cardNumber}</span>{" "}
              {activeGroup.patientName}
            </h2>
            <p className="text-sm text-gray-500">{activeGroup.visits.length} visit(s)</p>
          </div>

          <div className="mt-3 divide-y rounded-lg border bg-white shadow-sm">
            {activeGroup.visits.map((r) => (
              <div key={r.id}>
                <button
                  onClick={() => setExpandedVisit(expandedVisit === r.id ? null : r.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-amber-50/40"
                >
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Visit {r.visitNumber}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    {r.dateEthiopian} (EC) · Dr. {r.doctorName}
                    <span className="text-gray-400">{expandedVisit === r.id ? "▲" : "▼"}</span>
                  </span>
                </button>
                {expandedVisit === r.id && (
                  <div className="border-t bg-gray-50/60 px-4 py-3">
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <RecordField label="Diagnosis" value={r.diagnosis} />
                      <RecordField label="Treatment" value={r.treatment} />
                      <RecordField label="Prescription" value={r.prescription} />
                      <RecordField label="Notes" value={r.notes} />
                      {r.nextAppointmentEthiopian && (
                        <RecordField label="Next appointment (EC)" value={r.nextAppointmentEthiopian} />
                      )}
                    </dl>
                  </div>
                )}
              </div>
            ))}
            {activeGroup.visits.length === 0 && (
              <div className="p-8 text-center text-gray-500">No visits recorded yet.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-500">
            {role === "DOCTOR"
              ? "Your patients with records — click one to see their visits"
              : "Patients with records — click one to see their visits"}
          </p>

          <div className="mt-3 overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Card #</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">Last visit (EC)</th>
                  <th className="px-4 py-3">Last doctor</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((g) => {
                  const last = g.visits[g.visits.length - 1];
                  return (
                    <tr key={g.cardNumber} className="hover:bg-amber-50/40">
                      <td className="px-4 py-2.5 font-semibold text-amber-700">{g.cardNumber}</td>
                      <td className="px-4 py-2.5">{g.patientName}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {g.visits.length} visit(s)
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{last?.dateEthiopian ?? "—"}</td>
                      <td className="px-4 py-2.5">{last ? `Dr. ${last.doctorName}` : "—"}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => {
                            setOpenGroup(g);
                            setExpandedVisit(null);
                          }}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          View detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && groups.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No medical records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageCount={Math.max(1, Math.ceil(groups.length / PAGE_SIZE))}
            onPageChange={setPage}
          />
        </>
      )}
      {loading && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

      {showForm && (
        <NewRecordDialog
          preselected={selectedPatient}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load(selectedPatient);
          }}
        />
      )}
    </div>
  );
}

function RecordField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function PatientPicker({
  selected,
  onSelect,
}: {
  selected: Patient | null;
  onSelect: (p: Patient | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);

  useEffect(() => {
    if (!search.trim() || selected) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(search.trim())}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.patients);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2 text-sm">
        <span>
          <span className="font-semibold text-amber-700">#{selected.cardNumber}</span>{" "}
          {selected.fullName}
        </span>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setSearch("");
          }}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          clear
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search patient by name, phone or card number..."
        className="w-full rounded-md border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
          {results.map((p) => (
            <li key={p.cardNumber}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50"
              >
                <span className="font-semibold text-amber-700">#{p.cardNumber}</span> {p.fullName}{" "}
                <span className="text-gray-400">{p.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewRecordDialog({
  preselected,
  onClose,
  onCreated,
}: {
  preselected: Patient | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(preselected);
  const [nextAppt, setNextAppt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patient) {
      toast.error("Select a patient first");
      return;
    }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientCardNumber: patient.cardNumber,
        diagnosis: String(form.get("diagnosis") ?? ""),
        treatment: String(form.get("treatment") ?? "") || undefined,
        prescription: String(form.get("prescription") ?? "") || undefined,
        notes: String(form.get("notes") ?? "") || undefined,
        nextAppointmentEthiopian: nextAppt || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      const issues = data?.issues
        ? Object.values(data.issues).flat().join(", ")
        : data?.error ?? "Failed to save record";
      toast.error(String(issues));
      return;
    }
    toast.success(`Record saved — visit #${data.record.visitNumber}`);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">New Medical Record</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Patient *</label>
            <div className="mt-1">
              <PatientPicker selected={patient} onSelect={setPatient} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Diagnosis *</label>
            <textarea name="diagnosis" required rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Treatment</label>
            <textarea name="treatment" rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Prescription</label>
            <textarea name="prescription" rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Next appointment (EC)</label>
              <div className="mt-1">
                <EthiopianDatePicker value={nextAppt} onChange={setNextAppt} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <input name="notes" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
