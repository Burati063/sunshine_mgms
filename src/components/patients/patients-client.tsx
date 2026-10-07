"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Pagination from "@/components/pagination";
import type { Patient } from "@/types/patient";

export default function PatientsClient({ canCreate }: { canCreate: boolean }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (searchTerm: string, pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    else params.set("page", String(pageNum));
    const res = await fetch(`/api/patients?${params}`);
    if (!res.ok) {
      toast.error("Failed to load patients");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPatients(data.patients);
    setPageCount(data.pageCount);
    setTotal(data.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search.trim(), page), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, page, load]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patients</h1>
        {canCreate && (
          <div className="flex gap-2">
            <a
              href="/api/patients/export"
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Export CSV
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              + New Patient
            </button>
          </div>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search by name, phone or card number..."
        className="mt-4 w-full max-w-md rounded-md border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
      />
      {!search && total > 0 && (
        <p className="mt-2 text-xs text-gray-400">{total} patients registered</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Card #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Registered (EC)</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.map((p) => (
              <tr key={p.cardNumber} className="hover:bg-amber-50/40">
                <td className="px-4 py-2.5 font-semibold text-amber-700">
                  <Link href={`/dashboard/patients/${p.cardNumber}`} className="hover:underline">
                    {p.cardNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/dashboard/patients/${p.cardNumber}`} className="hover:underline">
                    {p.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{p.age ?? "—"}</td>
                <td className="px-4 py-2.5">{p.gender ?? "—"}</td>
                <td className="px-4 py-2.5">{p.phone || "—"}</td>
                <td className="px-4 py-2.5">{p.registrationDateEthiopian ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      p.importedFromExcel
                        ? "rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                        : "rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700"
                    }
                  >
                    {p.importedFromExcel ? "Imported" : "Registered"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/dashboard/patients/${p.cardNumber}`}
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    View detail
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!search && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
      {loading && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

      {showForm && (
        <NewPatientDialog
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            setSearch("");
            setPage(1);
            load("", 1);
          }}
        />
      )}
    </div>
  );
}

function NewPatientDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      age: form.get("age") ? Number(form.get("age")) : null,
      gender: String(form.get("gender") ?? ""),
      subcity: String(form.get("subcity") ?? "") || undefined,
      address: String(form.get("address") ?? "") || undefined,
      woreda: String(form.get("woreda") ?? "") || undefined,
      phone: String(form.get("phone") ?? ""),
      emergencyPhone: String(form.get("emergencyPhone") ?? "") || undefined,
    };

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      const issues = data?.issues
        ? Object.values(data.issues).flat().join(", ")
        : data?.error ?? "Failed to register patient";
      toast.error(String(issues));
      return;
    }
    toast.success(`Patient registered — card number ${data.patient.cardNumber}`);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Register New Patient</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Card number is assigned automatically (continues from 3801).
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">First name *</label>
              <input name="firstName" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Last name *</label>
              <input name="lastName" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Age</label>
              <input name="age" type="number" min={0} max={150} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Gender *</label>
              <select name="gender" required defaultValue="" className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                <option value="" disabled>
                  Select gender...
                </option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Subcity</label>
              <input name="subcity" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Woreda</label>
              <input name="woreda" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input name="address" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Phone number *</label>
              <input name="phone" required placeholder="09..." className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Emergency contact phone</label>
              <input name="emergencyPhone" placeholder="09..." className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
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
              {saving ? "Saving..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
