"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import PasswordInput from "@/components/password-input";
import Pagination from "@/components/pagination";
import { CopyIcon } from "@/components/icons";
import type { UserProfile } from "@/types/user";

const PAGE_SIZE = 10;

export default function UsersClient({ currentUid }: { currentUid: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [otpInfo, setOtpInfo] = useState<{ username: string; otp: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (!res.ok) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(u: UserProfile) {
    const res = await fetch(`/api/users/${u.uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Update failed");
      return;
    }
    toast.success(`${u.username} ${u.isActive ? "deactivated" : "activated"}`);
    load();
  }

  async function generateOtp(u: UserProfile) {
    const res = await fetch(`/api/users/${u.uid}/otp`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Failed to generate OTP");
      return;
    }
    setOtpInfo({ username: u.username, otp: data.otp });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          + New User
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Full name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Specialization</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((u) => (
              <tr key={u.uid}>
                <td className="px-4 py-2.5 font-medium">{u.username}</td>
                <td className="px-4 py-2.5">{u.fullName}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2.5">{u.specialization ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      u.isActive
                        ? "rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700"
                        : "rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700"
                    }
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditTarget(u)}
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    {u.uid !== currentUid && (
                      <button
                        onClick={() => toggleActive(u)}
                        className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                    <button
                      onClick={() => generateOtp(u)}
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Reset OTP
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(users.length / PAGE_SIZE))}
        onPageChange={setPage}
      />
      {loading && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

      {showForm && (
        <NewUserDialog
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <EditUserDialog
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      {otpInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg">
            <h2 className="text-lg font-semibold">OTP for {otpInfo.username}</h2>
            <p className="mt-3 text-4xl font-bold tracking-[0.3em] text-amber-600">{otpInfo.otp}</p>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(otpInfo.otp);
                toast.success("OTP copied to clipboard");
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <CopyIcon className="h-3.5 w-3.5" /> Copy code
            </button>
            <p className="mt-3 text-sm text-gray-500">
              Valid for 15 minutes. Give this code to the user — they reset their password at{" "}
              <span className="font-mono">/reset-password</span>.
            </p>
            <button
              onClick={() => setOtpInfo(null)}
              className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("RECEPTIONIST");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        fullName: String(form.get("fullName") ?? ""),
        role,
        specialization: String(form.get("specialization") ?? "") || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      const issues = data?.issues
        ? Object.values(data.issues).flat().join(", ")
        : data?.error ?? "Failed to create user";
      toast.error(String(issues));
      return;
    }
    toast.success(`User "${data.user.username}" created`);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Create User</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Username *</label>
              <input name="username" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Password *</label>
              <div className="mt-1">
                <PasswordInput name="password" required minLength={8} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Full name *</label>
            <input name="fullName" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {role === "DOCTOR" && (
              <div>
                <label className="block text-sm font-medium">Specialization</label>
                <input name="specialization" placeholder="e.g. Orthodontics" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            )}
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
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      fullName: String(form.get("fullName") ?? ""),
    };
    if (user.role === "DOCTOR") {
      payload.specialization = String(form.get("specialization") ?? "") || null;
    }

    const res = await fetch(`/api/users/${user.uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(data?.error ?? "Update failed");
      return;
    }
    toast.success(`User "${user.username}" updated`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">
          Edit User <span className="text-amber-600">{user.username}</span>
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Role: {user.role} · Username cannot be changed. Use "Reset OTP" for passwords.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Full name *</label>
            <input name="fullName" required defaultValue={user.fullName} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          {user.role === "DOCTOR" && (
            <div>
              <label className="block text-sm font-medium">Specialization</label>
              <input
                name="specialization"
                defaultValue={user.specialization ?? ""}
                placeholder="e.g. Orthodontics"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
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
