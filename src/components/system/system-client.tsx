"use client";

import { formatDateTimeEC } from "@/lib/ethiopian-calendar";

interface BackupEntry {
  createdAt: string;
  createdBy: string;
  counts: Record<string, number>;
}

export default function SystemClient({ history }: { history: BackupEntry[] }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">System — Backup</h1>

      <div className="mt-6 max-w-xl rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Create backup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Downloads a JSON file with all patients, users, appointments, medical records and
          counters. Keep backup files in a safe place.
        </p>
        <a
          href="/api/admin/backup"
          className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Download backup
        </a>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Backup history</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Contents</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.map((b) => (
              <tr key={b.createdAt}>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {formatDateTimeEC(b.createdAt)}
                </td>
                <td className="px-4 py-2.5">{b.createdBy}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  {Object.entries(b.counts)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No backups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
