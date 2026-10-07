import { getCurrentUser } from "@/lib/auth";
import PatientsClient from "@/components/patients/patients-client";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const user = await getCurrentUser();
  const canCreate = user?.role === "ADMIN" || user?.role === "RECEPTIONIST";
  return <PatientsClient canCreate={canCreate} />;
}
