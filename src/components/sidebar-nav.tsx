"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/user";
import {
  DashboardIcon,
  UsersIcon,
  CalendarIcon,
  ClipboardIcon,
  UserIcon,
  ClockIcon,
  DatabaseIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon, exact: true },
  { href: "/dashboard/patients", label: "Patients", Icon: UsersIcon },
  { href: "/dashboard/appointments", label: "Appointments", Icon: CalendarIcon },
  { href: "/dashboard/records", label: "Records", Icon: ClipboardIcon },
  { href: "/dashboard/users", label: "Users", Icon: UserIcon, adminOnly: true },
  { href: "/dashboard/activity", label: "Activity", Icon: ClockIcon, adminOnly: true },
  { href: "/dashboard/system", label: "System", Icon: DatabaseIcon, adminOnly: true },
];

export default function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN").map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-amber-100 text-amber-800"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <item.Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
