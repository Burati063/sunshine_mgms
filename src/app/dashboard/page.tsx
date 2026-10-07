import Link from "next/link";
import type { ComponentType } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { PATIENTS_COLLECTION } from "@/lib/patients";
import {
  UsersIcon,
  UserIcon,
  CalendarIcon,
  ClipboardIcon,
  ClockIcon,
  DatabaseIcon,
  type IconProps,
} from "@/components/icons";
import {
  formatEthiopianDate,
  formatEthiopianDateLong,
  gregorianToEthiopian,
} from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS: Record<string, { href: string; Icon: ComponentType<IconProps>; title: string; desc: string }[]> = {
  ADMIN: [
    { href: "/dashboard/patients", Icon: UsersIcon, title: "Register patient", desc: "Add a new patient (next card: auto)" },
    { href: "/dashboard/appointments", Icon: CalendarIcon, title: "Book appointment", desc: "Schedule a visit with a doctor" },
    { href: "/dashboard/users", Icon: UserIcon, title: "Manage users", desc: "Create staff accounts, reset passwords" },
    { href: "/dashboard/system", Icon: DatabaseIcon, title: "Backup data", desc: "Download or restore a backup" },
  ],
  RECEPTIONIST: [
    { href: "/dashboard/patients", Icon: UsersIcon, title: "Register patient", desc: "Add a new patient (next card: auto)" },
    { href: "/dashboard/appointments", Icon: CalendarIcon, title: "Book appointment", desc: "Schedule a visit with a doctor" },
    { href: "/dashboard/records", Icon: ClipboardIcon, title: "View records", desc: "Look up patient visit history" },
  ],
  DOCTOR: [
    { href: "/dashboard/appointments", Icon: CalendarIcon, title: "My appointments", desc: "Today's and upcoming visits" },
    { href: "/dashboard/records", Icon: ClipboardIcon, title: "Write record", desc: "Document a patient visit" },
    { href: "/dashboard/patients", Icon: UsersIcon, title: "Find patient", desc: "Search by name, phone or card" },
  ],
};

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const db = adminDb();

  const todayEC = gregorianToEthiopian(new Date());
  const todayStr = formatEthiopianDate(todayEC);
  const isDoctor = user.role === "DOCTOR";

  let scheduledQuery: FirebaseFirestore.Query = db
    .collection("appointments")
    .where("status", "==", "SCHEDULED");
  if (isDoctor) scheduledQuery = scheduledQuery.where("doctorId", "==", user.uid);

  const recordsQuery: FirebaseFirestore.Query = isDoctor
    ? db.collection("medicalRecords").where("doctorId", "==", user.uid)
    : db.collection("medicalRecords");

  const [patientsSnap, scheduledSnap, recordsSnap, usersSnap, todaySnap] = await Promise.all([
    db.collection(PATIENTS_COLLECTION).count().get(),
    scheduledQuery.count().get(),
    recordsQuery.count().get(),
    db.collection("users").count().get(),
    scheduledQuery.where("dateEthiopian", "==", todayStr).limit(20).get(),
  ]);

  const todayAppointments = todaySnap.docs
    .map((d) => d.data())
    .sort((a, b) => String(a.time ?? "99").localeCompare(String(b.time ?? "99")));

  const stats = [
    { label: "Total Patients", value: patientsSnap.data().count, Icon: UsersIcon, color: "bg-amber-50 text-amber-700" },
    { label: isDoctor ? "My Scheduled Visits" : "Scheduled Appointments", value: scheduledSnap.data().count, Icon: CalendarIcon, color: "bg-blue-50 text-blue-700" },
    { label: isDoctor ? "My Medical Records" : "Medical Records", value: recordsSnap.data().count, Icon: ClipboardIcon, color: "bg-green-50 text-green-700" },
    ...(user.role === "ADMIN"
      ? [{ label: "System Users", value: usersSnap.data().count, Icon: UserIcon, color: "bg-purple-50 text-purple-700" }]
      : [{ label: "Today's Appointments", value: todayAppointments.length, Icon: ClockIcon, color: "bg-rose-50 text-rose-700" }]),
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">
          {greeting}, {isDoctor ? "Dr. " : ""}{user.fullName}
        </h1>
        <p className="mt-1 text-sm text-amber-50">
          Today is {formatEthiopianDateLong(todayEC)} (EC) ·{" "}
          {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{" "}
          · Signed in as {user.role.toLowerCase()}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full ${s.color}`}>
              <s.Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Quick actions</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS[user.role].map((a) => (
          <Link
            key={a.href + a.title}
            href={a.href}
            className="rounded-lg border bg-white p-4 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40"
          >
            <a.Icon className="h-6 w-6 text-amber-600" />
            <p className="mt-2 font-semibold">{a.title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{a.desc}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">
        Today&apos;s appointments <span className="text-sm font-normal text-gray-400">({todayStr} EC)</span>
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Card #</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {todayAppointments.map((a, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 font-medium">{a.time ?? "—"}</td>
                <td className="px-4 py-2.5">{a.patientName}</td>
                <td className="px-4 py-2.5 font-semibold text-amber-700">{a.patientCardNumber}</td>
                <td className="px-4 py-2.5">Dr. {a.doctorName}</td>
                <td className="px-4 py-2.5">{a.purpose === "OTHER" ? a.customPurpose : a.purpose}</td>
              </tr>
            ))}
            {todayAppointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No appointments scheduled for today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
