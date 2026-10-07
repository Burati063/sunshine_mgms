import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete"), comment: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(1, "Reason required").max(300) }),
]);

// PATCH /api/appointments/[id] — complete or cancel
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(["ADMIN", "RECEPTIONIST", "DOCTOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.collection("appointments").doc(id);
  const snap = await ref.get();
  const appt = snap.data();
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  if (user.role === "DOCTOR" && appt.doctorId !== user.uid) {
    return NextResponse.json({ error: "Not your appointment" }, { status: 403 });
  }
  if (appt.status !== "SCHEDULED") {
    return NextResponse.json({ error: `Appointment is already ${appt.status.toLowerCase()}` }, { status: 409 });
  }

  const updates =
    parsed.data.action === "complete"
      ? {
          status: "COMPLETED",
          completionNote: parsed.data.comment || null,
          updatedAt: new Date().toISOString(),
        }
      : {
          status: "CANCELLED",
          cancellationReason: parsed.data.reason,
          updatedAt: new Date().toISOString(),
        };

  await ref.update(updates);

  logActivity(db, {
    userId: user.uid,
    username: user.username,
    action: parsed.data.action === "complete" ? "APPOINTMENT_COMPLETED" : "APPOINTMENT_CANCELLED",
    entityType: "appointment",
    entityId: id,
    details:
      parsed.data.action === "complete" && parsed.data.comment
        ? `${appt.patientName} — ${parsed.data.comment}`
        : appt.patientName,
  });

  const updated = await ref.get();
  return NextResponse.json({ appointment: updated.data() });
}
