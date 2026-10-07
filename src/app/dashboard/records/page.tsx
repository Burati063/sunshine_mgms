import { getCurrentUser } from "@/lib/auth";
import RecordsClient from "@/components/records/records-client";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const user = await getCurrentUser();
  return <RecordsClient role={user!.role} />;
}
