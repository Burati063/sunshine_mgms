import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { formatDateTimeEC } from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Logged in",
  PATIENT_REGISTERED: "Registered patient",
  USER_CREATED: "Created user",
  USER_UPDATED: "Updated user",
  OTP_GENERATED: "Generated reset OTP",
  PASSWORD_RESET: "Password reset",
  APPOINTMENT_BOOKED: "Booked appointment",
  APPOINTMENT_COMPLETED: "Completed appointment",
  APPOINTMENT_CANCELLED: "Cancelled appointment",
  RECORD_CREATED: "Created medical record",
  BACKUP_CREATED: "Downloaded backup",
  RESTORE_PERFORMED: "Restored backup",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const db = adminDb();
  const [snap, countSnap] = await Promise.all([
    db
      .collection("activityLogs")
      .orderBy("timestamp", "desc")
      .offset((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .get(),
    db.collection("activityLogs").count().get(),
  ]);
  const logs = snap.docs.map((d) => d.data());
  const total = countSnap.data().count;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold">Activity Log</h1>
      <p className="mt-1 text-sm text-gray-500">
        {total} actions recorded · page {page} of {pageCount}
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                  {formatDateTimeEC(log.timestamp)}
                </td>
                <td className="px-4 py-2.5 font-medium">{log.username}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{log.details ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {page > 1 ? (
          <Link
            href={`/dashboard/activity?page=${page - 1}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← Previous
          </Link>
        ) : (
          <span className="rounded-md border px-3 py-1.5 text-sm opacity-40">← Previous</span>
        )}
        <span className="text-sm text-gray-500">
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={`/dashboard/activity?page=${page + 1}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Next →
          </Link>
        ) : (
          <span className="rounded-md border px-3 py-1.5 text-sm opacity-40">Next →</span>
        )}
      </div>
    </div>
  );
}
