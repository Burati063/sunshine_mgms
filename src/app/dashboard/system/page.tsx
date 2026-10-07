import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import SystemClient from "@/components/system/system-client";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const snap = await adminDb()
    .collection("backups")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();
  const history = snap.docs.map((d) => {
    const data = d.data();
    return {
      createdAt: data.createdAt as string,
      createdBy: data.createdBy as string,
      counts: data.counts as Record<string, number>,
    };
  });

  return <SystemClient history={history} />;
}
