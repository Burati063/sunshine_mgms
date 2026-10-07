import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/logout-button";
import SidebarNav from "@/components/sidebar-nav";
import { ToothIcon } from "@/components/icons";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r bg-white">
        <div className="border-b px-5 py-4">
          <span className="flex items-center gap-2 text-lg font-bold text-amber-600">
            <ToothIcon className="h-5 w-5" /> Sunshine Dental
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav role={user.role} />
        </div>
        <div className="border-t p-4">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="mt-0.5">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              {user.role}
            </span>
          </p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="ml-60 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
