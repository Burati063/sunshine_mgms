import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UsersClient from "@/components/users/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");
  return <UsersClient currentUid={user.uid} />;
}
