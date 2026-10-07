/** One-off: assign all imported patients to Dr. selameyu. */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";

const BATCH_SIZE = 500;

async function main() {
  const db = adminDb();

  const docSnap = await db.collection("users").where("username", "==", "selameyu").limit(1).get();
  if (docSnap.empty) {
    console.error("User 'selameyu' not found.");
    process.exit(1);
  }
  const doctor = docSnap.docs[0];
  const data = doctor.data();
  if (data.role !== "DOCTOR") {
    console.error(`User 'selameyu' has role ${data.role}, not DOCTOR.`);
    process.exit(1);
  }
  console.log(`Doctor: ${data.fullName} (${doctor.id})`);

  const patientsSnap = await db.collection("patients").where("importedFromExcel", "==", true).get();
  console.log(`Assigning ${patientsSnap.size} imported patient(s) ...`);

  const docs = patientsSnap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.update(d.ref, { assignedDoctorId: doctor.id }));
    await batch.commit();
    console.log(`   ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Assignment failed:", err);
  process.exit(1);
});
