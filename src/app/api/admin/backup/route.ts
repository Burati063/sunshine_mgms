import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const BACKUP_COLLECTIONS = ["patients", "users", "appointments", "medicalRecords", "counters"] as const;

// GET /api/admin/backup — downloads a full JSON backup (admin only)
export async function GET() {
  const admin = await requireRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = adminDb();
  const collections: Record<string, Record<string, unknown>> = {};
  const counts: Record<string, number> = {};

  for (const name of BACKUP_COLLECTIONS) {
    const snap = await db.collection(name).get();
    const docs: Record<string, unknown> = {};
    snap.docs.forEach((d) => (docs[d.id] = d.data()));
    collections[name] = docs;
    counts[name] = snap.size;
  }

  const createdAt = new Date().toISOString();
  const backup = {
    version: 1,
    app: "sunshine-dental-clinic",
    createdAt,
    createdBy: admin.username,
    counts,
    collections,
  };

  await db.collection("backups").add({ createdAt, createdBy: admin.username, counts });
  logActivity(db, {
    userId: admin.uid,
    username: admin.username,
    action: "BACKUP_CREATED",
    entityType: "backup",
    entityId: createdAt,
    details: JSON.stringify(counts),
  });

  const filename = `sunshine-backup-${createdAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
  return new NextResponse(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
