import type { Firestore } from "firebase-admin/firestore";

export interface ActivityEntry {
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}

/** Fire-and-forget audit log write. Never throws. */
export function logActivity(db: Firestore, entry: ActivityEntry): void {
  db.collection("activityLogs")
    .add({ ...entry, timestamp: new Date().toISOString() })
    .catch((err) => console.error("activityLogs write failed:", err));
}
